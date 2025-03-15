const createCellShapeModule = ({ gridModule, parameters }) => {
    // Cell shape state
    const state = {
      transformState: {
        activeTransforms: new Map(),
        propagationType: parameters?.propagationType || 'gradient',
        snapIntensity: parameters?.snapIntensity || 1.0,
        densityFactors: new Map()
      }
    };

    // Calculate cell sphericity based on grid properties
    const calculateCellSphericity = () => {
      const resolution = gridModule.renderUtils.calculateGridResolution();
      const { width, height } = gridModule.getState().viewportDimensions;
      const aspectRatio = width / height;
      const cellSphericity = Math.max(
        gridModule.mathConstants.MIN_SPHERICITY,
        Math.min(
          gridModule.mathConstants.MAX_SPHERICITY,
          1 - (aspectRatio / resolution)
        )
      );
      console.debug("[CellShape] calculateCellSphericity:", { resolution, aspectRatio, cellSphericity });
      return cellSphericity;
    };
  
    // Calculate rotational symmetry based on grid characteristics
    const calculateRotationalSymmetry = () => {
      const density = gridModule.renderUtils.calculateGridDensity();
      const size = gridModule.renderUtils.calculateGridSize();
      const maxSymmetry = 8; // Maximum order of rotational symmetry
      const symmetryOrder = Math.floor((size * density)) % maxSymmetry;
      const rotationalSymmetry = Math.max(1, symmetryOrder);
      console.debug("[CellShape] calculateRotationalSymmetry:", { density, size, rotationalSymmetry });
      return rotationalSymmetry;
    };
  
    // Calculate axis symmetry based on grid resolution
    const calculateAxisSymmetry = () => {
      const resolution = gridModule.renderUtils.calculateGridResolution();
      const axisSymmetry = (resolution % 4) + 1; // Results in 1-4 axis symmetry
      console.debug("[CellShape] calculateAxisSymmetry:", { resolution, axisSymmetry });
      return axisSymmetry;
    };
  
    // Get base cell shape properties
    const getBaseShape = () => {
      const baseShape = {
        cellSphericity: calculateCellSphericity(),
        rotationalSymmetry: calculateRotationalSymmetry(),
        axisSymmetry: calculateAxisSymmetry()
      };
      console.debug("[CellShape] getBaseShape:", baseShape);
      return baseShape;
    };
  
    // Propagate transformation with specified behavior
    const propagateTransformation = (center, radius, transform) => {
      const baseShape = getBaseShape();
      console.debug("[CellShape] propagateTransformation: Using base shape", baseShape, "for center", center, "and radius", radius);
          
      switch (state.transformState.propagationType) {
        case 'gradient':
          return (point) => {
            const distance = Math.hypot(point.x - center.x, point.y - center.y);
            if (distance > radius) return null;
            
            const intensity = 1 - (distance / radius);
            const scaledShape = {
              cellSphericity: baseShape.cellSphericity * intensity,
              rotationalSymmetry: Math.max(1, Math.round(
                baseShape.rotationalSymmetry * intensity
              )),
              axisSymmetry: Math.max(1, Math.round(
                baseShape.axisSymmetry * intensity
              ))
            };
            
            state.transformState.densityFactors.set(point, intensity);
            console.debug("[CellShape] propagateTransformation (gradient):", { point, distance, intensity, scaledShape });            
            return {
              ...transform,
              ...scaledShape,
              magnitude: intensity
            };
          };
  
        case 'sharp':
          return (point) => {
            const distance = Math.hypot(point.x - center.x, point.y - center.y);
            if (distance > radius) return null;
            
            state.transformState.densityFactors.set(point, 1.0);
            console.debug("[CellShape] propagateTransformation (sharp):", { point, distance });            
            return {
              ...transform,
              ...baseShape,
              magnitude: 1.0
            };
          };
  
        case 'blended':
          return (point) => {
            const distance = Math.hypot(point.x - center.x, point.y - center.y);
            if (distance > radius) return null;
            
            const intensity = Math.cos((distance / radius) * Math.PI / 2);
            const scaledShape = {
              cellSphericity: baseShape.cellSphericity * intensity,
              rotationalSymmetry: Math.max(1, Math.round(
                baseShape.rotationalSymmetry * intensity
              )),
              axisSymmetry: Math.max(1, Math.round(
                baseShape.axisSymmetry * intensity
              ))
            };
            
            state.transformState.densityFactors.set(point, intensity);
            console.debug("[CellShape] propagateTransformation (blended):", { point, distance, intensity, scaledShape });            
            return {
              ...transform,
              ...scaledShape,
              magnitude: intensity
            };
          };
          default:
            console.warn("[CellShape] propagateTransformation: Unknown propagation type", state.transformState.propagationType);
            return () => null;          
      }
    };
  
    // Get effective shape at a point considering all transformations
    const getEffectiveShape = (point) => {
      const baseShape = getBaseShape();
      let resultShape = { ...baseShape };
  

      console.debug("[CellShape] getEffectiveShape: Starting with base shape", baseShape, "for point", point);
      for (const [center, { propagator }] of state.transformState.activeTransforms) {
        const transform = propagator(point);
        if (transform) {
          resultShape = {
            cellSphericity: Math.max(
              gridModule.mathConstants.MIN_SPHERICITY,
              Math.min(
                gridModule.mathConstants.MAX_SPHERICITY,
                resultShape.cellSphericity * transform.magnitude
              )
            ),
            rotationalSymmetry: Math.max(1, Math.round(resultShape.rotationalSymmetry * transform.magnitude)),
            axisSymmetry: Math.max(1, Math.round(resultShape.axisSymmetry * transform.magnitude))
          };
          console.debug("[CellShape] getEffectiveShape: Applied transform", transform, "resulting in shape", resultShape);
        }
      }
  
      return resultShape;
    };
  
    // Apply shape transformation
    const applyTransform = (center, radius, propagationType = 'gradient') => {
      state.transformState.propagationType = propagationType;
      console.info("[CellShape] applyTransform: Setting propagation type to", propagationType);

      const baseShape = getBaseShape();
      const transform = {
        ...baseShape,
        magnitude: 1.0
      };
  
      const propagator = propagateTransformation(center, radius, transform);
      
      state.transformState.activeTransforms.set(center, {
        propagator,
        radius,
        transform
      });
    console.info("[CellShape] applyTransform: Transformation applied at center", center, "with radius", radius);

      return {
        baseShape,
        transform,
        propagationType
      };
    };
  
    // Calculate grid adjustments based on shape
    const getGridAdjustments = (point) => {
      const shape = getEffectiveShape(point);
      const gridSize = gridModule.renderUtils.calculateGridSize();
      const adjustments = {
        size: gridSize * shape.cellSphericity,
        rotationAngle: (Math.PI * 2) / shape.rotationalSymmetry,
        axisCount: shape.axisSymmetry
      };
      console.debug("[CellShape] getGridAdjustments: For point", point, "computed adjustments", adjustments);
      return adjustments;
    };
  
    // Clear all transformations
    const clearTransforms = () => {
      state.transformState.activeTransforms.clear();
      state.transformState.densityFactors.clear();
      console.info("[CellShape] clearTransforms: All transformations cleared");      
    };
  
    // Set snap intensity for transformations
    const setSnapIntensity = (intensity) => {
      state.transformState.snapIntensity = Math.max(0, Math.min(1, intensity));
      console.info("[CellShape] setSnapIntensity: Snap intensity set to", state.transformState.snapIntensity);      
    };
  
    // Return public API
    return {
      applyTransform,
      getEffectiveShape,
      getGridAdjustments,
      clearTransforms,
      setSnapIntensity,
      getState: () => ({ ...state }),

    // Method to update parameters
      updateParameters: (newParams) => {
       if (newParams?.propagationType) {
        state.transformState.propagationType = newParams.propagationType;
        console.info("[CellShape] updateParameters: Propagation type updated to", newParams.propagationType);        
       }
       if (typeof newParams?.snapIntensity === 'number') {
        state.transformState.snapIntensity = newParams.snapIntensity;
        console.info("[CellShape] updateParameters: Snap intensity updated to", newParams.snapIntensity);        
       }
      }    
    };
  };
  
  export { createCellShapeModule };