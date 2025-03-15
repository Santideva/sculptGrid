// New deformation modes for shapeDeformer.js

import { DeformationMode } from './shapeDeformer.js';

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

// Rugosity Mode - creates realistic surface roughness
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

// Updated presets including new modes
export const extendedPresetConfigurations = {
  'terrain': {
    name: 'Terrain',
    description: 'Mountain-like terrain with roughness',
    amplitudes: [5, 10, 0, 0, 0, 0, 15, 20, 0, 0, 0] // Assuming 7 original modes + 4 new ones
  },
  'moon': {
    name: 'Moon Surface',
    description: 'Cratered surface like the moon',
    amplitudes: [0, 0, 0, 0, 0, 0, 5, 15, 0, 0, 10]
  },
  'symmetric': {
    name: 'Symmetric Form',
    description: 'Form with axial symmetry',
    amplitudes: [0, 0, 0, 0, 0, 0, 0, 0, 25, 0, 0]
  },
  'stretched': {
    name: 'Stretched Form',
    description: 'Anisotropically stretched form',
    amplitudes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 0]
  },
  'rippled_sphere': {
    name: 'Rippled Sphere',
    description: 'Sphere with radial waves',
    amplitudes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15]
  }
};