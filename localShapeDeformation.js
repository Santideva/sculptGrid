// Enhanced Local Shape Deformation Module - Complete Implementation
export const createDeformationModule = () => {
  // ========================
  // SECTION 1: Core Constants
  // ========================
  const mathConstants = Object.freeze({
    PI: Math.PI,
    TWO_PI: 2 * Math.PI,
    PHI: (1 + Math.sqrt(5)) / 2,
    SQRT2: Math.SQRT2,
    EPSILON: 1e-10,
    MAX_CURVATURE: 0.95
  });

  // =============================
  // SECTION 2: Mathematical Tools
  // =============================
  const complex = {
    add: (z1, z2) => ({ re: z1.re + z2.re, im: z1.im + z2.im }),
    subtract: (z1, z2) => ({ re: z1.re - z2.re, im: z1.im - z2.im }),
    multiply: (z1, z2) => ({
      re: z1.re * z2.re - z1.im * z2.im,
      im: z1.re * z2.im + z1.im * z2.re
    }),
    divide: (z1, z2) => {
      const denominator = z2.re ** 2 + z2.im ** 2;
      return {
        re: (z1.re * z2.re + z1.im * z2.im) / denominator,
        im: (z1.im * z2.re - z1.re * z2.im) / denominator
      };
    },
    fromPoint: (p) => ({ re: p.x, im: p.y }),
    toPoint: (z) => ({ x: z.re, y: z.im }),
    abs: (z) => Math.hypot(z.re, z.im),
    arg: (z) => Math.atan2(z.im, z.re),
    conj: (z) => ({ re: z.re, im: -z.im })
  };

  const geometry = {
    mobiusTransform: (z, params) => {
      const { a, b, c, d, regularizationFactor = mathConstants.EPSILON } = params;
      const numerator = complex.add(complex.multiply(a, z), b);
      const denominator = complex.add(complex.multiply(c, z), d);
      
      const denomAbs = complex.abs(denominator);
      if (denomAbs < regularizationFactor) {
        const direction = complex.arg(numerator);
        return {
          re: Math.cos(direction) * 1e6,
          im: Math.sin(direction) * 1e6
        };
      }
      return complex.divide(numerator, denominator);
    },

    stereographicProjection: (p, center, radius, direction = 1) => {
      const z = complex.fromPoint({
        x: (p.x - center.x) / radius,
        y: (p.y - center.y) / radius
      });
      
      const r = complex.abs(z);
      if (direction > 0) {
        const factor = 2 / (1 + r * r);
        return {
          x: factor * z.re * radius + center.x,
          y: factor * z.im * radius + center.y,
          z: (r * r - 1) / (r * r + 1) * radius
        };
      } else {
        if (Math.abs(p.z - radius) < mathConstants.EPSILON) {
          return { x: center.x, y: center.y };
        }
        const factor = radius / (radius - p.z);
        return {
          x: p.x * factor + center.x,
          y: p.y * factor + center.y
        };
      }
    },

    cylindricalMapping: (p, center, radius, direction = 1) => {
      const dx = p.x - center.x;
      const dy = p.y - center.y;
      
      if (direction > 0) {
        const theta = Math.atan2(dy, dx);
        const r = Math.hypot(dx, dy);
        return {
          x: radius * theta,
          y: r - radius,
          theta: theta
        };
      } else {
        const theta = p.x / radius;
        const r = p.y + radius;
        return {
          x: center.x + r * Math.cos(theta),
          y: center.y + r * Math.sin(theta)
        };
      }
    },

    conicMapping: (p, center, radius, eccentricity = 0.5, direction = 1) => {
      const z = complex.fromPoint({
        x: (p.x - center.x) / radius,
        y: (p.y - center.y) / radius
      });
      
      if (direction > 0) {
        const params = {
          a: { re: 1, im: 0 },
          b: { re: 0, im: 0 },
          c: { re: eccentricity, im: 0 },
          d: { re: 1, im: 0 }
        };
        const mappedZ = geometry.mobiusTransform(z, params);
        return complex.toPoint(mappedZ);
      } else {
        const params = {
          a: { re: 1, im: 0 },
          b: { re: 0, im: 0 },
          c: { re: -eccentricity, im: 0 },
          d: { re: 1, im: 0 }
        };
        const mappedZ = geometry.mobiusTransform(z, params);
        return complex.toPoint(mappedZ);
      }
    }
  };

  // ==========================
  // SECTION 3: Domain Framework
  // ==========================
  class Domain {
    constructor(type, config = {}) {
      this.type = type;
      this.center = config.center || { x: 0, y: 0 };
      this.radius = config.radius || 100;
      this.amplitude = config.amplitude || 0;
      this.blendMode = config.blendMode || 'smooth';
      this.options = config.options || {};
    }

    weightAt(point) {
      const distance = Math.hypot(
        point.x - this.center.x,
        point.y - this.center.y
      );
      return blendingFunctions[this.blendMode](distance, this.radius);
    }

    transform(point, direction = 1) {
      return { ...point };
    }

    inverse(transformedPoint) {
      return this._iterativeInverse(transformedPoint);
    }

    _iterativeInverse(target, tolerance = 0.1, maxIterations = 50) {
      let guess = { ...target };
      for (let i = 0; i < maxIterations; i++) {
        const forward = this.transform(guess);
        const dx = target.x - forward.x;
        const dy = target.y - forward.y;
        
        if (Math.hypot(dx, dy) < tolerance) break;
        
        guess.x += dx * 0.5;
        guess.y += dy * 0.5;
      }
      return guess;
    }

    curvatureFactor(point) {
      const distance = Math.hypot(
        point.x - this.center.x,
        point.y - this.center.y
      );
      switch(this.type) {
        case 'spherical':
          return 1 - Math.min(0.5, 1 - (distance/this.radius)**2);
        case 'cylindrical':
          return 0.7;
        case 'conic':
          return 1 - (this.options.eccentricity || 0.5) * 0.4;
        default:
          return 1;
      }
    }
  }

  // ----------------------
  // Domain Implementations
  // ----------------------
  class SphericalDomain extends Domain {
    transform(point, direction = 1) {
      return geometry.stereographicProjection(
        point,
        this.center,
        this.radius,
        direction
      );
    }
  }

  class CylindricalDomain extends Domain {
    transform(point, direction = 1) {
      return geometry.cylindricalMapping(
        point,
        this.center,
        this.radius,
        direction
      );
    }
  }

  class ConicDomain extends Domain {
    transform(point, direction = 1) {
      return geometry.conicMapping(
        point,
        this.center,
        this.radius,
        this.options.eccentricity || 0.5,
        direction
      );
    }
  }

  class NoiseDomain extends Domain {
    constructor(config) {
      super('noise', config);
      this.scale = config.scale || 0.1;
      this.octaves = config.octaves || 3;
      this.persistence = config.persistence || 0.5;
    }

    #noise(x, y) {
      let total = 0;
      let frequency = 1;
      let amplitude = 1;
      let maxValue = 0;

      for (let i = 0; i < this.octaves; i++) {
        total += this.#singleOctaveNoise(x * frequency, y * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= this.persistence;
        frequency *= 2;
      }

      return total / maxValue;
    }

    #singleOctaveNoise(x, y) {
      const X = Math.floor(x) & 255;
      const Y = Math.floor(y) & 255;
      const xf = x - Math.floor(x);
      const yf = y - Math.floor(y);
      
      const u = this.#fade(xf);
      const v = this.#fade(yf);
      
      const p = this.#permutation;
      const A = p[X] + Y;
      const B = p[X+1] + Y;
    
      return this.#lerp(
        v,
        this.#lerp(u, this.#grad(p[A], xf, yf), this.#lerp(u, this.#grad(p[B], xf - 1, yf)))
      );
    }
    

    #fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    #lerp(a, b, t) { return a + t * (b - a); }
    #grad(hash, x, y) {
      const h = hash & 15;
      const u = h < 8 ? x : y;
      const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
      return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    #permutation = Array.from({length: 512}, () => Math.floor(Math.random() * 256));

    transform(point) {
      const noiseVal = this.#noise(
        (point.x - this.center.x) * this.scale,
        (point.y - this.center.y) * this.scale
      ) * this.amplitude;
      
      return {
        x: point.x + noiseVal,
        y: point.y + noiseVal
      };
    }
  }

  class HarmonicDomain extends Domain {
    constructor(config) {
      super('harmonic', config);
      this.freqX = config.freqX || 3;
      this.freqY = config.freqY || 2;
      this.phase = config.phase || 0;
    }

    transform(point) {
      const dx = point.x - this.center.x;
      const dy = point.y - this.center.y;
      return {
        x: point.x + Math.sin(dx * this.freqX + this.phase) * this.amplitude,
        y: point.y + Math.cos(dy * this.freqY + this.phase) * this.amplitude
      };
    }
  }

  class GaussianCurvatureDomain extends Domain {
    constructor(config) {
      super('gaussian-curvature', config);
      this.spread = config.spread || 4;
    }

    transform(point) {
      const u = (point.x - this.center.x) / this.radius;
      const v = (point.y - this.center.y) / this.radius;
      
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
        const distSq = dx * dx + dy * dy;
        deformation += bump.sign * Math.exp(-distSq * this.spread);
      }
      
      return {
        x: point.x + deformation * this.amplitude,
        y: point.y + deformation * this.amplitude
      };
    }
  }

  // ==============================
  // SECTION 4: Deformation Manager
  // ==============================
  class DeformationManager {
    constructor() {
      this.domains = [];
      this.blendMode = 'smooth';
      this.presets = Object.assign({}, DeformationManager.builtInPresets);
    }

    addDomain(domainConfig) {
      const domain = DomainFactory.create(domainConfig.type, domainConfig);
      this.domains.push(domain);
      return domain;
    }

    removeDomain(index) {
      if (index >= 0 && index < this.domains.length) {
        this.domains.splice(index, 1);
      }
    }

    clearDomains() {
      this.domains = [];
    }

    transformPoint(point) {
      if (this.domains.length === 0) return { ...point };

      let totalX = 0;
      let totalY = 0;
      let totalWeight = 0;

      for (const domain of this.domains) {
        const weight = domain.weightAt(point);
        if (weight > 0) {
          const transformed = domain.transform(point);
          totalX += transformed.x * weight;
          totalY += transformed.y * weight;
          totalWeight += weight;
        }
      }

      if (totalWeight > 0) {
        return {
          x: totalX / totalWeight,
          y: totalY / totalWeight
        };
      }
      return { ...point };
    }

    inverseTransform(point) {
      return this.domains.reduceRight((result, domain) => {
        return domain.inverse(result);
      }, point);
    }

    calculateGridSize(point, baseSize) {
      let sizeAdjustment = 1;
      for (const domain of this.domains) {
        const weight = domain.weightAt(point);
        if (weight > 0) {
          sizeAdjustment *= domain.curvatureFactor(point) * (1 - weight) + 
                           (1 - weight * 0.5) * weight;
        }
      }
      return Math.max(baseSize * 0.2, baseSize * sizeAdjustment);
    }

    static builtInPresets = {
      basicSphere: {
        domains: [{ type: 'spherical', radius: 100 }]
      },
      organicTerrain: {
        domains: [
          { type: 'spherical', radius: 150, amplitude: 20 },
          { type: 'noise', scale: 0.05, amplitude: 15, octaves: 4 },
          { type: 'harmonic', freqX: 5, freqY: 3, amplitude: 10 }
        ]
      },
      mechanicalSurface: {
        domains: [
          { type: 'cylindrical', radius: 80, amplitude: 30 },
          { type: 'gaussian-curvature', spread: 6, amplitude: 15 }
        ]
      }
    };
  }

  // ============================
  // SECTION 5: Support Utilities
  // ============================
  const blendingFunctions = {
    sharp: (distance, radius) => distance <= radius ? 1 : 0,
    linear: (distance, radius) => Math.max(0, 1 - distance / radius),
    smooth: (distance, radius) => {
      const t = Math.min(1, distance / radius);
      return 0.5 * (1 + Math.cos(Math.PI * t));
    }
  };

  const DomainFactory = {
    create(type, config) {
      const constructorMap = {
        spherical: SphericalDomain,
        cylindrical: CylindricalDomain,
        conic: ConicDomain,
        noise: NoiseDomain,
        harmonic: HarmonicDomain,
        'gaussian-curvature': GaussianCurvatureDomain
      };
  
      const DomainConstructor = constructorMap[type];
      if (typeof DomainConstructor !== 'function') {
        console.error(`Invalid domain type: ${type}`);
        console.trace(); // Logs the current call stack to the console
        throw new Error(`DomainFactory: "${type}" is not a valid domain type. Check the stack trace for origin.`);
      }
  
      // Pass both type and config to the constructor
      return new DomainConstructor(type, config);
    }
  };
  
  

  // ==============================
  // SECTION 6: Legacy API Support
  // ==============================
  const legacyAPI = {
    applyDomainTransformation: (point, domainConfig, direction = 1) => {
      const domain = DomainFactory.create(domainConfig.type, domainConfig);
      return domain.transform(point, direction);
    },

    transformPointWithDomains: (point, domains, blendMode = 'smooth') => {
      const manager = new DeformationManager();
      manager.blendMode = blendMode;
      domains.forEach(config => manager.addDomain(config));
      return manager.transformPoint(point);
    },

    inverseTransformPointWithDomains: (point, domains, blendMode) => {
      const manager = new DeformationManager();
      manager.blendMode = blendMode;
      domains.forEach(config => manager.addDomain(config));
      return manager.inverseTransform(point);
    },

    calculateEffectiveGridSize: (point, domains, baseSize) => {
      const manager = new DeformationManager();
      domains.forEach(config => manager.addDomain(config));
      return manager.calculateGridSize(point, baseSize);
    }
  };

  // ====================
  // SECTION 7: Public API
  // ====================
  return {
    // Core Components
    DeformationManager,
    Domain,
    SphericalDomain,
    CylindricalDomain,
    ConicDomain,
    NoiseDomain,
    HarmonicDomain,
    GaussianCurvatureDomain,

    // Mathematical Tools
    mathConstants,
    complex,
    geometry,

    // Utilities
    blendingFunctions,
    DomainFactory,

    // Presets
    PRESETS: DeformationManager.builtInPresets,

    // Legacy API
    ...legacyAPI,

// Constants
DOMAIN_TYPES: {
  SPHERICAL: 'spherical',
  CYLINDRICAL: 'cylindrical',
  CONIC: 'conic',
  FLAT: 'flat',
  NOISE: 'noise',
  HARMONIC: 'harmonic',
  GAUSSIAN_CURVATURE: 'gaussian-curvature'
},

// Version information
VERSION: '1.0.0',

// Factory method for creating domains
createDomain: (type, config) => DomainFactory.create(type, config),

// Helper methods
createPreset: (presetName) => {
  const preset = DeformationManager.builtInPresets[presetName];
  if (!preset) throw new Error(`Unknown preset: ${presetName}`);
  
  const manager = new DeformationManager();
  preset.domains.forEach(config => manager.addDomain(config));
  return manager;
},

// Utility methods
distanceBetween: (p1, p2) => Math.hypot(p2.x - p1.x, p2.y - p1.y),

isPointInDomain: (point, domain) => {
  const distance = Math.hypot(
    point.x - domain.center.x,
    point.y - domain.center.y
  );
  return distance <= domain.radius;
}
};
};

// // Export for different module systems
// if (typeof module !== 'undefined' && module.exports) {
// module.exports = createDeformationModule();
// } else if (typeof define === 'function' && define.amd) {
// define([], function() { return createDeformationModule(); });
// } else {
// window.deformationModule = createDeformationModule();
// }