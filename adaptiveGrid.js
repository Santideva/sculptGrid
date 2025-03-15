import { createDeformationModule } from './localShapeDeformation.js';
import { createCacheModule } from './cacheModule.js';
import { createSnappingModule } from './createSnappingModule.js';

const createAdaptiveGridModule = ({ ctx, parameters = {} }) => {
  // Import the deformation module
  const deformationModule = createDeformationModule();
  // Create a cache instance for managing various caches by name
  const cache = createCacheModule();
  // Instantiate the snapping module
  const snappingModule = createSnappingModule();

  // Default parameters
  const defaultParams = {
    grid: {
      size: 20,
      baseResolution: 10,
      baseCellCount: 100,
      showGrid: true,
      opacity: 0.7,
      color: '#333333',
      snapToGrid: true,
      showDomains: false // Optional flag to display transformation domains
    },
    transformations: {
      blendMode: 'smooth', // 'sharp', 'linear', 'smooth'
      defaultRadius: 150,
      maxActiveDomains: 5, // Limit active transformation domains
      regularizationFactor: 0.001 // For singularity handling
    }
  };

  // Merge with provided parameters
  const mergedParams = {
    grid: { ...defaultParams.grid, ...(parameters.grid || {}) },
    transformations: { ...defaultParams.transformations, ...(parameters.transformations || {}) }
  };

  // Alias for deformation module constants
  const DOMAIN_TYPES = deformationModule.DOMAIN_TYPES;

  // Internal state to track grid and transformation properties
  const state = {
    // Grid state
    viewportDimensions: {
      width: ctx.canvas.width,
      height: ctx.canvas.height
    },
    zoomLevel: 1,
    panOffset: { x: 0, y: 0 },
    
    // Transformation domains
    transformationDomains: [] // Stores active transformation domains
  };

  // ------------------- TRANSFORMATION DOMAIN MANAGEMENT -------------------

  // Updated transformation domain creation using the deformation module’s factory method
  const createTransformationDomain = (center, radius, type = DOMAIN_TYPES.SPHERICAL, options = {}) => {
    // Enforce maximum number of active domains
    if (state.transformationDomains.length >= mergedParams.transformations.maxActiveDomains) {
      // Remove the oldest domain
      state.transformationDomains.shift();
    }
    
    // Use the factory method from the deformation module to create the domain
    const domain = deformationModule.createDomain(type, {
      center: { ...center },
      radius,
      options: { ...options }
    });
    
    // Optionally assign an id and created timestamp for internal tracking
    domain.id = Date.now();
    domain.created = Date.now();
    
    state.transformationDomains.push(domain);
    
    // Clear caches when adding a new domain
    cache.clear("transformationCache");
    cache.clear("blendingCache");
    
    console.info("[AdaptiveGrid] Created transformation domain:", { type, center, radius });
    return domain;
  };

  // Remove a transformation domain
  const removeTransformationDomain = (domainId) => {
    const initialLength = state.transformationDomains.length;
    state.transformationDomains = state.transformationDomains.filter(domain => domain.id !== domainId);
    
    if (initialLength !== state.transformationDomains.length) {
      // Clear caches when removing domains
      cache.clear("transformationCache");
      cache.clear("blendingCache");
      console.info("[AdaptiveGrid] Removed transformation domain:", { domainId });
      return true;
    }
    
    return false;
  };

  // Clear all transformation domains
  const clearTransformationDomains = () => {
    state.transformationDomains = [];
    cache.clear("transformationCache");
    cache.clear("blendingCache");
    console.info("[AdaptiveGrid] Cleared all transformation domains");
  };

  // ------------------- GRID TRANSFORMATION LOGIC -------------------

  // New blending function using each domain's weightAt() method
  const calculateBlendingWeights = (point) => {
    const cacheKey = `${point.x},${point.y}`;
    if (cache.has("blendingCache", cacheKey)) {
      return cache.get("blendingCache", cacheKey);
    }

    // Compute each domain's contribution
    const transformWeights = state.transformationDomains.map(domain => ({
      domain,
      weight: domain.weightAt(point)
    }));

    // Compute the remaining flat weight so total influence sums to 1
    const totalWeight = transformWeights.reduce((sum, { weight }) => sum + weight, 0);
    const flatWeight = Math.max(0, 1 - totalWeight);

    const result = { transformWeights, flatWeight };
    cache.set("blendingCache", cacheKey, result);
    return result;
  };

  const transformPoint = (point) => {
    const cacheKey = `${point.x},${point.y}`;
    if (cache.has("transformationCache", cacheKey)) {
      return cache.get("transformationCache", cacheKey);
    }
    
    const { transformWeights, flatWeight } = calculateBlendingWeights(point);
    
    // If fully in flat space, simply return the original point.
    if (flatWeight === 1) {
      const flatPoint = { ...point };
      cache.set("transformationCache", cacheKey, flatPoint);
      return flatPoint;
    }
    
    // Blend: start with flat contribution.
    let resultX = flatWeight * point.x;
    let resultY = flatWeight * point.y;
    
    // Add each domain's contribution.
    transformWeights.forEach(({ domain, weight }) => {
      if (weight > 0) {
        // Using the domain's own transform() method.
        const transformed = domain.transform(point, 1);
        resultX += weight * transformed.x;
        resultY += weight * transformed.y;
      }
    });
    
    const result = { x: resultX, y: resultY };
    cache.set("transformationCache", cacheKey, result);
    return result;
  };

  // Inverse transform a point from transformed space to original space
  const inverseTransformPoint = (transformedPoint) => {
    return deformationModule.inverseTransformPointWithDomains(
      transformedPoint, 
      state.transformationDomains, 
      mergedParams.transformations.blendMode
    );
  };

  // ------------------- GRID GENERATION AND RENDERING -------------------

  // Calculate the effective grid size based on transformations
  const calculateEffectiveGridSize = (point) => {
    return deformationModule.calculateEffectiveGridSize(
      point, 
      state.transformationDomains, 
      mergedParams.grid.size, 
      mergedParams.transformations.blendMode
    );
  };

  // Generate grid points based on viewport and transformations
  const generateGridPoints = () => {
    const { width, height } = state.viewportDimensions;
    const baseGridSize = mergedParams.grid.size;
    
    // Calculate grid bounds with some padding
    const startX = -baseGridSize;
    const startY = -baseGridSize;
    const endX = width + baseGridSize;
    const endY = height + baseGridSize;
    
    const gridPoints = [];
    
    // Generate base grid points
    for (let x = startX; x <= endX; x += baseGridSize) {
      for (let y = startY; y <= endY; y += baseGridSize) {
        gridPoints.push({
          original: { x, y },
          transformed: transformPoint({ x, y })
        });
      }
    }
    
    return gridPoints;
  };

  // Generate grid cells (quads) connecting grid points
  const generateGridCells = () => {
    const { width, height } = state.viewportDimensions;
    const baseGridSize = mergedParams.grid.size;
    
    const cacheKey = `${width}-${height}-${baseGridSize}-${state.transformationDomains.length}`;
    
    if (cache.has("gridCellCache", cacheKey)) {
      return cache.get("gridCellCache", cacheKey);
    }
    
    // Calculate grid bounds with some padding
    const startX = -baseGridSize;
    const startY = -baseGridSize;
    const endX = width + baseGridSize;
    const endY = height + baseGridSize;
    
    const gridCells = [];
    
    // Generate grid cells as quads
    for (let x = startX; x < endX; x += baseGridSize) {
      for (let y = startY; y < endY; y += baseGridSize) {
        // Define the four corners of a grid cell
        const corners = [
          { x, y },
          { x: x + baseGridSize, y },
          { x: x + baseGridSize, y: y + baseGridSize },
          { x, y: y + baseGridSize }
        ];
        
        // Transform each corner
        const transformedCorners = corners.map(p => transformPoint(p));
        
        gridCells.push({
          original: corners,
          transformed: transformedCorners
        });
      }
    }
    
    cache.set("gridCellCache", cacheKey, gridCells);
    return gridCells;
  };

  // Render the grid
  const renderGrid = () => {
    if (!mergedParams.grid.showGrid) {
      return;
    }
    
    const cells = generateGridCells();
    
    ctx.save();
    ctx.globalAlpha = mergedParams.grid.opacity;
    ctx.strokeStyle = mergedParams.grid.color;
    ctx.lineWidth = 0.5;
    
    // Draw each grid cell
    cells.forEach(cell => {
      const { transformed } = cell;
      
      ctx.beginPath();
      ctx.moveTo(transformed[0].x, transformed[0].y);
      
      for (let i = 1; i < transformed.length; i++) {
        ctx.lineTo(transformed[i].x, transformed[i].y);
      }
      
      ctx.closePath();
      ctx.stroke();
    });
    
    // Optionally highlight transformation domains
    if (mergedParams.grid.showDomains) {
      state.transformationDomains.forEach(domain => {
        ctx.beginPath();
        ctx.arc(domain.center.x, domain.center.y, domain.radius, 0, 2 * Math.PI);
        
        // Use different colors for different domain types
        switch (domain.type) {
          case DOMAIN_TYPES.SPHERICAL:
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            break;
          case DOMAIN_TYPES.CYLINDRICAL:
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
            break;
          case DOMAIN_TYPES.CONIC:
            ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
            break;
          default:
            ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)';
        }
        
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }
    
    ctx.restore();
  };

  // ------------------- COORDINATE SNAPPING -------------------

  // Snap a point to the grid using the external snapping module
  const snapToGrid = (point) => {
    if (!mergedParams.grid.snapToGrid) {
      return { ...point };
    }
    
    // Delegate the snapping operation to the snapping module.
    // It uses transformPoint, inverseTransformPoint, and calculateEffectiveGridSize from this module.
    return snappingModule.snapTransformedPoint(
      point,
      transformPoint,
      inverseTransformPoint,
      calculateEffectiveGridSize
    );
  };

  // ------------------- VIEWPORT & INTERACTION HANDLING -------------------

  // Set zoom level
  const setZoomLevel = (newZoomLevel) => {
    // Constrain zoom level to reasonable values
    const constrainedZoom = Math.max(0.1, Math.min(10, newZoomLevel));
    
    if (state.zoomLevel !== constrainedZoom) {
      state.zoomLevel = constrainedZoom;
      
      // Clear caches as zoom affects grid appearance
      cache.clear("gridCellCache");
      
      console.info("[AdaptiveGrid] Zoom level set to:", constrainedZoom);
    }
    
    return state.zoomLevel;
  };

  // Set pan offset
  const setPanOffset = (x, y) => {
    state.panOffset = { x, y };
    
    // Clear certain caches on pan
    cache.clear("gridCellCache");
    
    console.info("[AdaptiveGrid] Pan offset set to:", { x, y });
    return state.panOffset;
  };

  // Update viewport dimensions
  const updateViewportDimensions = (width, height) => {
    state.viewportDimensions = { width, height };
    
    // Clear caches on resize
    cache.clear("gridCellCache");
    
    console.info("[AdaptiveGrid] Viewport dimensions updated:", { width, height });
    return state.viewportDimensions;
  };

  // Initialize module
  const initialize = () => {
    // Set initial viewport dimensions
    updateViewportDimensions(ctx.canvas.width, ctx.canvas.height);
    
    // Initial render if grid is visible
    if (mergedParams.grid.showGrid) {
      renderGrid();
    }
    
    console.info("[AdaptiveGrid] Module initialized");
  };

  // ------------------- PUBLIC API -------------------

  return {
    // Core functionality
    initialize,
    renderGrid,
    
    // Transformation management
    createTransformationDomain,
    removeTransformationDomain,
    clearTransformationDomains,
    
    // Domain type constants
    DOMAIN_TYPES,
    
    // Coordinate transformation and snapping
    transformPoint,
    inverseTransformPoint,
    snapToGrid,
    
    // Grid properties
    calculateEffectiveGridSize,
    generateGridPoints,
    generateGridCells,
    
    // Viewport controls
    setZoomLevel,
    setPanOffset,
    updateViewportDimensions,
    
    // Configuration access
    getParameters: () => ({ ...mergedParams }),
    updateParameters: (newParams) => {
      if (newParams.grid) {
        mergedParams.grid = { ...mergedParams.grid, ...newParams.grid };
      }
      if (newParams.transformations) {
        mergedParams.transformations = { 
          ...mergedParams.transformations, 
          ...newParams.transformations 
        };
      }
      
      // Clear grid cell cache when parameters change
      cache.clear("gridCellCache");
      
      console.info("[AdaptiveGrid] Parameters updated");
    },
    
    // State access
    getState: () => ({ ...state }),
    
    // Math utilities exposed from the deformation module
    utils: {
      complex: deformationModule.complex,
      mobiusTransform: deformationModule.mobiusTransform,
      blendingFunctions: deformationModule.blendingFunctions,
      mathConstants: deformationModule.mathConstants
    }
  };
};

export { createAdaptiveGridModule };
