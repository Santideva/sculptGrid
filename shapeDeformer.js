// shapeDeformer.js - A comprehensive system for 3D shape deformations

// Base deformation mode class
export class DeformationMode {
    constructor(name, description, defaultAmplitude = 0) {
      this.name = name;
      this.description = description;
      this.defaultAmplitude = defaultAmplitude;
      this.amplitude = defaultAmplitude;
    }
  
    // Apply this specific deformation to the given point
    // theta: angle around equator (0 to 2π)
    // phi: angle from pole to pole (0 to π)
    // basePoint: optional 3D point with normalized x,y,z coordinates
    // Returns the radial deformation value
    applyDeformation(theta, phi, basePoint) {
      // Base class doesn't deform - override in subclasses
      return 0;
    }
  
    // Reset amplitude to default value
    reset() {
      this.amplitude = this.defaultAmplitude;
    }
  }
  
  // ================ HARMONIC DEFORMATION MODES ================
  
  // Basic harmonic modes
  export class HarmonicMode extends DeformationMode {
    constructor(name, description, thetaFreq, phiFreq, defaultAmplitude = 0) {
      super(name, description, defaultAmplitude);
      this.thetaFreq = thetaFreq;  // Frequency around equator
      this.phiFreq = phiFreq;      // Frequency from pole to pole
    }
  
    applyDeformation(theta, phi) {
      return this.amplitude * Math.sin(this.thetaFreq * theta) * Math.sin(this.phiFreq * phi);
    }
  }
  
  // Cosine-based harmonic mode
  export class CosineHarmonicMode extends HarmonicMode {
    applyDeformation(theta, phi) {
      return this.amplitude * Math.cos(this.thetaFreq * theta) * Math.sin(this.phiFreq * phi);
    }
  }
  
  // Mixed harmonic mode (combination of sine and cosine)
  export class MixedHarmonicMode extends DeformationMode {
    constructor(name, description, defaultAmplitude = 0) {
      super(name, description, defaultAmplitude);
    }
  
    applyDeformation(theta, phi) {
      return this.amplitude * Math.sin(theta + 3 * phi) * Math.cos(2 * theta);
    }
  }
  
  // ================ NOISE-BASED DEFORMATION MODES ================
  
  // Basic noise deformation
  export class NoiseDeformation extends DeformationMode {
    constructor(name, description, defaultAmplitude = 0, scale = 1) {
      super(name, description, defaultAmplitude);
      this.scale = scale;
    }
  
    // Simple noise function (for better results, use a proper noise library)
    noise3D(x, y, z) {
      return Math.sin(x * 0.1 * this.scale) * 
             Math.cos(y * 0.1 * this.scale) * 
             Math.sin(z * 0.1 * this.scale);
    }
  
    applyDeformation(theta, phi, basePoint) {
      if (!basePoint) return 0;
      
      const {x, y, z} = basePoint;
      const noiseValue = this.noise3D(x * 10, y * 10, z * 10);
      
      return this.amplitude * noiseValue;
    }
  }
  
  // Rugosity Mode - creates realistic surface roughness with fractal noise
  export class RugosityMode extends DeformationMode {
    constructor(name = "Rugosity", description = "Creates fractal-like surface roughness", defaultAmplitude = 0) {
      super(name, description, defaultAmplitude);
      // Initialize different scales for fractal noise
      this.scales = [1, 2, 4, 8];
      this.weights = [0.5, 0.25, 0.125, 0.0625];
    }
    
    // Improved 3D noise function with multiple octaves for fractal effect
    noise3D(x, y, z, scale) {
      // Simple noise function, could be replaced with a better one like Perlin or Simplex
      return Math.sin(x * 0.1 * scale) * 
             Math.cos(y * 0.1 * scale) * 
             Math.sin(z * 0.1 * scale);
    }
    
    applyDeformation(theta, phi, basePoint) {
      if (!basePoint) return 0;
      
      const {x, y, z} = basePoint;
      
      // Apply multiple layers of noise at different scales (fractal approach)
      let noiseValue = 0;
      for (let i = 0; i < this.scales.length; i++) {
        noiseValue += this.weights[i] * this.noise3D(x * 10, y * 10, z * 10, this.scales[i]);
      }
      
      return this.amplitude * noiseValue;
    }
  }
  
  // ================ CURVATURE-BASED DEFORMATION MODES ================
  
  // Gaussian Curvature Mode - creates areas of positive and negative curvature
  export class GaussianCurvatureMode extends DeformationMode {
    constructor(name = "Gaussian Curvature", description = "Creates areas of positive and negative curvature", defaultAmplitude = 0, spread = 4) {
      super(name, description, defaultAmplitude);
      this.spread = spread; // Controls the spread of the gaussian function
    }
    
    applyDeformation(theta, phi, basePoint) {
      // Convert spherical coordinates to a 2D space for the gaussian
      const u = theta / Math.PI - 1; // Map to [-1, 1]
      const v = phi / Math.PI * 2 - 1; // Map to [-1, 1]
      
      // Multiple gaussian bumps/dimples at different positions
      const bumps = [
        { x: 0.5, y: 0.5, sign: 1 },
        { x: -0.5, y: -0.5, sign: 1 },
        { x: 0.5, y: -0.5, sign: -1 },
        { x: -0.5, y: 0.5, sign: -1 }
      ];
      
      let deformation = 0;
      
      for (const bump of bumps) {
        const dx = u - bump.x;
        const dy = v - bump.y;
        const distSquared = dx * dx + dy * dy;
        const gaussian = Math.exp(-distSquared * this.spread);
        deformation += bump.sign * gaussian;
      }
      
      return this.amplitude * deformation;
    }
  }
  
  // ================ SYMMETRY DEFORMATION MODES ================
  
  // Axial Symmetry Mode - enforces symmetry around an axis
  export class AxialSymmetryMode extends DeformationMode {
    constructor(name = "Axial Symmetry", description = "Enforces symmetry around the Y axis", defaultAmplitude = 0) {
      super(name, description, defaultAmplitude);
    }
    
    applyDeformation(theta, phi, basePoint) {
      if (!basePoint) return 0;
      
      // Calculate azimuthal angle from the X-Z plane
      const azimuth = Math.atan2(basePoint.x, basePoint.z);
      
      // Create wave pattern along the azimuth angle
      // Higher amplitude makes the deformation more pronounced
      return this.amplitude * Math.sin(6 * azimuth) * Math.sin(phi);
    }
  }
  
  // Radial Wave Mode - creates concentric waves from poles
  export class RadialWaveMode extends DeformationMode {
    constructor(name = "Radial Waves", description = "Creates concentric waves emanating from poles", defaultAmplitude = 0, frequency = 5) {
      super(name, description, defaultAmplitude);
      this.frequency = frequency;
    }
    
    applyDeformation(theta, phi) {
      // Distance from pole (0 at poles, 1 at equator)
      const polarDistance = Math.sin(phi);
      
      // Create waves based on distance from poles
      return this.amplitude * Math.sin(this.frequency * Math.PI * polarDistance);
    }
  }
  
  // ================ SCALING DEFORMATION MODES ================
  
  // Anisotropic Scaling Mode - creates directionally dependent scaling
  export class AnisotropicMode extends DeformationMode {
    constructor(name = "Anisotropic Scaling", description = "Creates directionally dependent deformations", defaultAmplitude = 0) {
      super(name, description, defaultAmplitude);
      this.xScale = 1.0;
      this.yScale = 0.5;
      this.zScale = 0.75;
    }
    
    applyDeformation(theta, phi, basePoint) {
      if (!basePoint) return 0;
      
      const {x, y, z} = basePoint;
      
      // Create an anisotropic scaling effect that depends on direction
      const deformation = (
        x * x * this.xScale +
        y * y * this.yScale +
        z * z * this.zScale
      ) / (this.xScale + this.yScale + this.zScale);
      
      return this.amplitude * (deformation - 0.33); // Center around 0
    }
  }
  
  // ================ MAIN SHAPE DEFORMER CLASS ================
  
  // Main shape deformer class that manages all deformation modes
  export class ShapeDeformer {
    constructor(baseRadius) {
      this.baseRadius = baseRadius;
      this.modes = [];
      this.setupDefaultModes();
    }
  
    // Initialize with all available deformation modes
    setupDefaultModes() {
      // ------ Basic Harmonic Modes ------
      this.addMode(new HarmonicMode("Mode 1", "3 waves around equator, 2 waves pole-to-pole", 3, 2));
      this.addMode(new HarmonicMode("Mode 2", "5 waves around equator, 3 waves pole-to-pole", 5, 3));
      this.addMode(new HarmonicMode("Mode 3", "7 waves around equator, 1 wave pole-to-pole", 7, 1));
      this.addMode(new CosineHarmonicMode("Pinch", "Pinching effect along longitude lines", 4, 4));
      this.addMode(new HarmonicMode("Ripple", "Radial ripple effect from poles", 0, 3));
      this.addMode(new MixedHarmonicMode("Twisted", "Twisted torus-like deformation"));
      
      // ------ Noise-Based Modes ------
      this.addMode(new NoiseDeformation("Noise", "Organic, natural-looking irregularities"));
      this.addMode(new RugosityMode("Rugosity", "Creates fractal-like surface roughness"));
      
      // ------ Curvature Modes ------
      this.addMode(new GaussianCurvatureMode("Gaussian Curvature", "Creates areas of positive and negative curvature"));
      
      // ------ Symmetry Modes ------
      this.addMode(new AxialSymmetryMode("Axial Symmetry", "Enforces symmetry around the Y axis"));
      this.addMode(new RadialWaveMode("Radial Waves", "Creates concentric waves emanating from poles"));
      
      // ------ Scaling Modes ------
      this.addMode(new AnisotropicMode("Anisotropic", "Creates directionally dependent deformations"));
    }
  
    // Add a new deformation mode
    addMode(mode) {
      this.modes.push(mode);
      return this.modes.length - 1; // Return index of the newly added mode
    }
  
    // Remove a mode by index
    removeMode(index) {
      if (index >= 0 && index < this.modes.length) {
        this.modes.splice(index, 1);
        return true;
      }
      return false;
    }
  
    // Set amplitude for a specific mode
    setAmplitude(index, value) {
      if (index >= 0 && index < this.modes.length) {
        this.modes[index].amplitude = value;
        return true;
      }
      return false;
    }
  
    // Apply all deformations to create a deformed sphere
    createDeformedSphere(numPointsTheta, numPointsPhi) {
      const points = [];
      
      for (let j = 0; j <= numPointsPhi; j++) {
        const phi = j * Math.PI / numPointsPhi;
        const row = [];
        
        for (let i = 0; i <= numPointsTheta; i++) {
          const theta = i * 2 * Math.PI / numPointsTheta;
          
          // Generate the base point coordinates (normalized)
          const baseX = Math.sin(phi) * Math.cos(theta);
          const baseY = Math.sin(phi) * Math.sin(theta);
          const baseZ = Math.cos(phi);
          const basePoint = { x: baseX, y: baseY, z: baseZ };
          
          // Apply deformation from all active modes
          let totalDeformation = 0;
          for (const mode of this.modes) {
            totalDeformation += mode.applyDeformation(theta, phi, basePoint);
          }
          
          // Calculate final radius and position
          const r = this.baseRadius + totalDeformation;
          const x = r * baseX;
          const y = r * baseY;
          const z = r * baseZ;
          
          row.push({ x, y, z });
        }
        points.push(row);
      }
      
      return points;
    }
  
    // Get array of all mode names for UI
    getModeNames() {
      return this.modes.map(mode => mode.name);
    }
  
    // Get more detailed mode info for UI display
    getModeInfo() {
      return this.modes.map(mode => ({
        name: mode.name,
        description: mode.description,
        amplitude: mode.amplitude,
        defaultAmplitude: mode.defaultAmplitude
      }));
    }
  
    // Apply a preset configuration
    applyPreset(presetConfig) {
      for (let i = 0; i < this.modes.length && i < presetConfig.amplitudes.length; i++) {
        this.modes[i].amplitude = presetConfig.amplitudes[i];
      }
    }
  
    // Get current configuration as a preset
    getCurrentPreset(name = "Custom") {
      return {
        name: name,
        amplitudes: this.modes.map(mode => mode.amplitude)
      };
    }
    
    // Reset all modes to their default amplitudes
    resetAllModes() {
      for (const mode of this.modes) {
        mode.reset();
      }
    }
  }
  
  // ================ PRESET CONFIGURATIONS ================
  
  // Preset configurations for various shapes
  export const presetConfigurations = {
    'sphere': {
      name: 'Sphere',
      description: 'Perfect sphere with no deformations',
      amplitudes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    'star': {
      name: 'Star',
      description: 'Star-like shape with pointed protrusions',
      amplitudes: [30, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    'rippled': {
      name: 'Rippled',
      description: 'Sphere with rippled surface',
      amplitudes: [0, 20, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    'twisted': {
      name: 'Twisted',
      description: 'Twisted torus-like shape',
      amplitudes: [0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0]
    },
    'noisy': {
      name: 'Noisy',
      description: 'Irregular surface with noise',
      amplitudes: [0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0]
    },
    'terrain': {
      name: 'Terrain',
      description: 'Mountain-like terrain with roughness',
      amplitudes: [5, 10, 0, 0, 0, 0, 5, 15, 0, 0, 0, 0]
    },
    'moon': {
      name: 'Moon Surface',
      description: 'Cratered surface like the moon',
      amplitudes: [0, 0, 0, 0, 0, 0, 5, 15, 10, 0, 0, 0]
    },
    'symmetric': {
      name: 'Symmetric Form',
      description: 'Form with axial symmetry',
      amplitudes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 25, 0, 0]
    },
    'stretched': {
      name: 'Stretched Form',
      description: 'Anisotropically stretched form',
      amplitudes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20]
    },
    'rippled_sphere': {
      name: 'Rippled Sphere',
      description: 'Sphere with radial waves',
      amplitudes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0]
    },
    'complex_form': {
      name: 'Complex Form',
      description: 'Complex shape using multiple deformation modes',
      amplitudes: [10, 5, 0, 10, 0, 5, 5, 5, 0, 0, 0, 0]
    }
  };