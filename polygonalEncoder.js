// PolygonalEncoder.js - An enhanced encoding system using polygonal number principles

/**
 * Class representing a flexible polygonal encoding system
 * Optimized for fast lookup, brevity, and efficient caching of complex objects
 */
class PolygonalEncoder {
    constructor(options = {}) {
      // Default mappings with brevity in mind
      this.mappings = options.mappings || {
        shapes: { "monogon": 1, "digon": 2, "trigon": 3, "square": 4, "pentagon": 5, "hexagon": 6 },
        colors: { "red": 1, "blue": 2, "green": 3, "yellow": 4, "purple": 5, "cyan": 6, "white": 7 }
      };
      
      // Optimized transformers
      this.transformers = options.transformers || {
        position: this._defaultPositionTransformer,
        orientation: this._defaultOrientationTransformer,
        volume: this._defaultVolumeTransformer,
        density: this._defaultDensityTransformer
      };
      
      // Cache for fast lookups
      this.cache = new Map();
      
      // Secondary indices for faster lookups
      this.indices = new Map();
      
      // Normalization factors for better comparisons
      this.normalizationFactors = options.normalizationFactors || {};
      
      // Weight factors for properties in similarity lookups
      this.weights = options.weights || {};
      
      // Schema version for backward compatibility
      this.version = options.version || "1.0";
    }
    
    /**
     * Encodes an object into a set of numerical values
     * @param {Object} object - The object to encode
     * @param {Array} properties - Properties to encode (empty for all)
     * @returns {Object} Encoded numerical values
     */
    encode(object, properties = []) {
      const result = {};
      const propsToEncode = properties.length > 0 ? properties : this._getAllEncodableProps(object);
      
      for (const prop of propsToEncode) {
        if (object[prop] === undefined) continue;
        
        // Check if there's a mapping for this property type
        const mappingKey = `${prop}s`; // Convert to plural for mapping lookup
        
        if (this.mappings[mappingKey] && this.mappings[mappingKey][object[prop]] !== undefined) {
          result[`${prop}Number`] = this.mappings[mappingKey][object[prop]];
        }
        // Check if there's a transformer for this property
        else if (this.transformers[prop]) {
          result[`${prop}Number`] = this._normalize(
            prop,
            this.transformers[prop].call(this, object[prop], object)
          );
        }
        // Use direct value if it's a number
        else if (typeof object[prop] === 'number') {
          result[`${prop}Number`] = this._normalize(prop, object[prop]);
        }
      }
      
      return result;
    }
    
    /**
     * Get all properties that can be encoded for an object
     * @private
     */
    _getAllEncodableProps(object) {
      const props = new Set();
      
      // Add mappable properties
      for (const category in this.mappings) {
        const prop = category.slice(0, -1); // Remove 's' from plural
        if (object[prop] !== undefined) props.add(prop);
      }
      
      // Add transformable properties
      for (const prop in this.transformers) {
        if (object[prop] !== undefined) props.add(prop); 
      }
      
      // Add numeric properties
      for (const prop in object) {
        if (typeof object[prop] === 'number') props.add(prop);
      }
      
      return Array.from(props);
    }
    
    /**
     * Normalize a value based on defined normalization factors
     * @private
     */
    _normalize(property, value) {
      const factor = this.normalizationFactors[property];
      return factor ? value / factor : value;
    }
    
    /**
     * Creates an improved hash for an encoded object
     * Uses FNV-1a inspired algorithm for better distribution
     * @param {Object} encodedObject - The encoded object
     * @returns {string} A unique hash
     */
    createHash(encodedObject) {
      // Sort keys for consistent hashing
      const keys = Object.keys(encodedObject).sort();
      
      // FNV-1a inspired hashing
      let hash = 2166136261;
      for (const key of keys) {
        const value = encodedObject[key];
        hash ^= key.charCodeAt(0);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        hash ^= Math.floor(value * 100); // Quantize float values
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
      }
      
      return (hash >>> 0).toString(36); // Force positive number
    }
    
    /**
     * Stores an object in the cache with optimized indexing
     * @param {Object} object - The original object
     * @param {Object} encodedProperties - The encoded properties (optional)
     * @returns {string} The cache key
     */
    cacheObject(object, encodedProperties = null) {
      const encoded = encodedProperties || this.encode(object);
      const hash = this.createHash(encoded);
      
      // Store in main cache
      this.cache.set(hash, object);
      
      // Create secondary indices for fast lookups
      for (const [prop, value] of Object.entries(encoded)) {
        if (!this.indices.has(prop)) {
          this.indices.set(prop, new Map());
        }
        
        // Round the value for indexing to allow for small variations
        const indexValue = Math.round(value * 100) / 100;
        const propIndex = this.indices.get(prop);
        
        if (!propIndex.has(indexValue)) {
          propIndex.set(indexValue, new Set());
        }
        
        propIndex.get(indexValue).add(hash);
      }
      
      return hash;
    }
    
    /**
     * Retrieves an object from the cache
     * @param {string} hash - The cache key
     * @returns {Object|null} The cached object or null if not found
     */
    retrieveFromCache(hash) {
      return this.cache.get(hash) || null;
    }
    
    /**
     * Optimized lookup function using indices for better performance
     * @param {Object} partialObject - Object with properties to match
     * @param {Object} options - Search options
     * @returns {Array} Array of matching objects
     */
    lookupSimilar(partialObject, options = {}) {
      const threshold = options.threshold || 0.01;
      const maxResults = options.maxResults || Infinity;
      const partialEncoded = this.encode(partialObject);
      
      // Use indexed lookup when possible
      if (Object.keys(partialEncoded).length === 1 && !options.exactMatch) {
        const [prop, value] = Object.entries(partialEncoded)[0];
        return this._indexedLookup(prop, value, threshold, maxResults);
      }
      
      // Fall back to full scan with ranking
      return this._rankedLookup(partialEncoded, threshold, maxResults, options.exactMatch);
    }
    
    /**
     * Fast lookup using secondary indices
     * @private
     */
    _indexedLookup(prop, value, threshold, maxResults) {
      const results = [];
      const propIndex = this.indices.get(prop);
      
      if (!propIndex) return results;
      
      // Find all values within threshold
      for (const [indexValue, hashSet] of propIndex.entries()) {
        if (Math.abs(indexValue - value) <= threshold) {
          for (const hash of hashSet) {
            if (results.length < maxResults) {
              results.push(this.cache.get(hash));
            } else {
              return results;
            }
          }
        }
      }
      
      return results;
    }
    
    /**
     * Ranked lookup with similarity scoring
     * @private
     */
    _rankedLookup(partialEncoded, threshold, maxResults, exactMatch) {
      const candidates = [];
      
      for (const [hash, object] of this.cache.entries()) {
        const objectEncoded = this.encode(object);
        const score = this._calculateSimilarity(partialEncoded, objectEncoded);
        
        if ((exactMatch && score === 1.0) || (!exactMatch && score >= 1.0 - threshold)) {
          candidates.push({ object, score });
        }
      }
      
      // Sort by similarity score
      candidates.sort((a, b) => b.score - a.score);
      
      // Return just the objects (not scores)
      return candidates.slice(0, maxResults).map(c => c.object);
    }
    
    /**
     * Calculate weighted similarity between two encoded objects
     * @private
     */
    _calculateSimilarity(encoded1, encoded2) {
      let totalWeight = 0;
      let weightedSimilarity = 0;
      
      for (const prop in encoded1) {
        if (encoded2[prop] === undefined) continue;
        
        const weight = this.weights[prop] || 1;
        totalWeight += weight;
        
        const diff = Math.abs(encoded1[prop] - encoded2[prop]);
        const propSimilarity = Math.max(0, 1 - diff);
        weightedSimilarity += propSimilarity * weight;
      }
      
      return totalWeight > 0 ? weightedSimilarity / totalWeight : 0;
    }
    
    /**
     * Serialize the encoder state for storage or transmission
     * @returns {Object} Serialized state
     */
    serialize() {
      return {
        version: this.version,
        mappings: this.mappings,
        normalizationFactors: this.normalizationFactors,
        weights: this.weights
      };
    }
    
    /**
     * Restore encoder state from serialized data
     * @param {Object} data - Previously serialized state
     */
    deserialize(data) {
      this.version = data.version;
      this.mappings = data.mappings;
      this.normalizationFactors = data.normalizationFactors;
      this.weights = data.weights;
      this.cache.clear();
      this.indices.clear();
    }
    
    /**
     * Clear the cache and indices
     */
    clearCache() {
      this.cache.clear();
      this.indices.clear();
    }
    
    // Default transformers (optimized for brevity)
    _defaultPositionTransformer(position) {
      return Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);
    }
    
    _defaultOrientationTransformer(eulerAngles) {
      return Math.abs(eulerAngles.x) + Math.abs(eulerAngles.y) + Math.abs(eulerAngles.z);
    }
    
    _defaultVolumeTransformer(volume, object) {
      if (!object.eulerAngles) return volume;
      const { x, y, z } = object.eulerAngles;
      return volume * (Math.abs(Math.cos(x)) + Math.abs(Math.sin(y)) + Math.abs(Math.cos(z)));
    }
    
    _defaultDensityTransformer(density, object) {
      if (!object.eulerAngles || !object.volume) return density;
      const { x, y, z } = object.eulerAngles;
      return density * (Math.abs(Math.sin(x)) + Math.abs(Math.cos(y)) + Math.abs(Math.sin(z)));
    }
    
    /**
     * Add or update a mapping category
     * @param {string} category - The category name (plural)
     * @param {Object} mapping - The mapping object
     */
    addMapping(category, mapping) {
      this.mappings[category] = mapping;
      // Clear indices related to this category
      const propName = `${category.slice(0, -1)}Number`;
      this.indices.delete(propName);
    }
    
    /**
     * Add or update a transformer function
     * @param {string} property - The property name
     * @param {Function} transformer - The transformer function
     */
    addTransformer(property, transformer) {
      this.transformers[property] = transformer;
      // Clear indices related to this property
      const propName = `${property}Number`;
      this.indices.delete(propName);
    }
    
    /**
     * Set weight for a property in similarity calculations
     * @param {string} property - Property name
     * @param {number} weight - Weight value
     */
    setWeight(property, weight) {
      this.weights[property] = weight;
    }
    
    /**
     * Set normalization factor for a property
     * @param {string} property - Property name
     * @param {number} factor - Normalization factor
     */
    setNormalizationFactor(property, factor) {
      this.normalizationFactors[property] = factor;
    }
  }
  
  export default PolygonalEncoder;