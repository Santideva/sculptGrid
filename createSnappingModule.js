// createSnappingModule.js
const createSnappingModule = () => {
    // Private constants and configurations
    const SNAP_MODES = {
      GRID: 'grid',
      INTERSECTION: 'intersection',
      NONE: 'none'
    };
  
    // Default snap settings
    const defaultSettings = {
      enabled: true,
      mode: SNAP_MODES.GRID,
      tolerance: 10, // Snap tolerance in pixels
      visualFeedback: true,
      snapStrength: 1.0 // 0.0-1.0, allows for partial snapping
    };
  
    // Current settings
    let settings = { ...defaultSettings };
  
    // Simple snap to nearest grid point
    const snapToGridPoint = (point, gridSize) => {
      if (!settings.enabled || settings.mode === SNAP_MODES.NONE) {
        return { ...point };
      }
      
      return {
        x: Math.round(point.x / gridSize) * gridSize,
        y: Math.round(point.y / gridSize) * gridSize
      };
    };
  
    // More advanced snap with partial attraction based on distance
    const snapWithAttraction = (point, gridPoint, strength = settings.snapStrength) => {
      if (strength >= 1.0) {
        return { ...gridPoint };
      }
      
      // Linear interpolation between original and snapped point
      return {
        x: point.x + (gridPoint.x - point.x) * strength,
        y: point.y + (gridPoint.y - point.y) * strength
      };
    };
  
    // Find the nearest grid intersection point
    const findNearestGridPoint = (point, gridPoints, tolerance = settings.tolerance) => {
      let nearestPoint = null;
      let minDistance = Infinity;
      
      for (const gridPoint of gridPoints) {
        const distance = Math.sqrt(
          Math.pow(gridPoint.x - point.x, 2) + 
          Math.pow(gridPoint.y - point.y, 2)
        );
        
        if (distance < minDistance && distance <= tolerance) {
          minDistance = distance;
          nearestPoint = gridPoint;
        }
      }
      
      return nearestPoint;
    };
  
    // Snap to grid with transformations applied
    const snapTransformedPoint = (point, transformFn, inverseFn, effectiveGridSizeFn) => {
      if (!settings.enabled || settings.mode === SNAP_MODES.NONE) {
        return { ...point };
      }
      
      // First, inverse transform to get to original grid space
      const originalPoint = inverseFn(point);
      
      // Calculate effective grid size at this point
      const gridSize = effectiveGridSizeFn(originalPoint);
      
      // Snap in original space
      const snappedOriginal = snapToGridPoint(originalPoint, gridSize);
      
      // Transform back to get the snapped point in transformed space
      return transformFn(snappedOriginal);
    };
  
    // Specialized snap for grid intersections
    const snapToGridIntersection = (point, gridPoints) => {
      if (!settings.enabled || settings.mode === SNAP_MODES.NONE) {
        return { ...point };
      }
      
      const nearestPoint = findNearestGridPoint(point, gridPoints);
      
      if (!nearestPoint) {
        return { ...point };
      }
      
      return snapWithAttraction(point, nearestPoint);
    };
  
    // Calculate snap indicators for visual feedback
    const calculateSnapIndicators = (point, snappedPoint) => {
      if (!settings.visualFeedback || !settings.enabled || 
          (point.x === snappedPoint.x && point.y === snappedPoint.y)) {
        return null;
      }
      
      return {
        original: { ...point },
        snapped: { ...snappedPoint },
        distance: Math.sqrt(
          Math.pow(snappedPoint.x - point.x, 2) + 
          Math.pow(snappedPoint.y - point.y, 2)
        )
      };
    };
  
    // Render snap indicators (if needed)
    const renderSnapIndicators = (ctx, indicators) => {
      if (!indicators || !settings.visualFeedback) {
        return;
      }
      
      const { original, snapped } = indicators;
      
      ctx.save();
      
      // Draw line connecting original and snapped points
      ctx.beginPath();
      ctx.moveTo(original.x, original.y);
      ctx.lineTo(snapped.x, snapped.y);
      ctx.strokeStyle = 'rgba(0, 128, 255, 0.5)';
      ctx.setLineDash([2, 2]);
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Draw original point
      ctx.beginPath();
      ctx.arc(original.x, original.y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 128, 0, 0.5)';
      ctx.fill();
      
      // Draw snapped point
      ctx.beginPath();
      ctx.arc(snapped.x, snapped.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(0, 128, 255, 0.7)';
      ctx.fill();
      
      ctx.restore();
    };
  
    // Public API
    return {
      // Constants
      SNAP_MODES,
      
      // Core snapping functions
      snapToGridPoint,
      snapWithAttraction,
      findNearestGridPoint,
      snapTransformedPoint,
      snapToGridIntersection,
      
      // Visual feedback
      calculateSnapIndicators,
      renderSnapIndicators,
      
      // Configuration
      getSettings: () => ({ ...settings }),
      updateSettings: (newSettings) => {
        settings = { ...settings, ...newSettings };
        return { ...settings };
      },
      enable: () => {
        settings.enabled = true;
        return true;
      },
      disable: () => {
        settings.enabled = false;
        return false;
      },
      setMode: (mode) => {
        if (Object.values(SNAP_MODES).includes(mode)) {
          settings.mode = mode;
          return true;
        }
        return false;
      }
    };
  };
  
  export { createSnappingModule };