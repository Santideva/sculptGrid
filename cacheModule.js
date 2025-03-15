import PolygonalEncoder from './PolygonalEncoder.js';

/**
 * Creates a reusable cache module for efficient data storage and retrieval
 * @param {Object} options - Configuration options including encoderOptions
 * @returns {Object} Cache module with methods for managing cached data
 */
const createCacheModule = (options = {}) => {
  // Internal cache storage
  const caches = new Map();
  // Store encoders if enhanced functionality is used
  const encoders = new Map();
  
  // Extract encoder options
  const encoderOptions = options.encoderOptions || {};
  // Flag to determine if we should use enhanced features
  const useEnhancedFeatures = options.enhanced !== false;

  /**
   * Gets or creates an encoder for a specific cache
   * @param {string} cacheName - Name of the cache
   * @returns {PolygonalEncoder} The encoder instance
   */
  const getEncoder = (cacheName) => {
    if (!encoders.has(cacheName)) {
      encoders.set(cacheName, new PolygonalEncoder(encoderOptions));
    }
    return encoders.get(cacheName);
  };

  /**
   * Creates or retrieves a named cache
   * @param {string} cacheName - Name identifier for the cache
   * @returns {Map} - The requested cache instance
   */
  const getCache = (cacheName) => {
    if (!caches.has(cacheName)) {
      caches.set(cacheName, new Map());
    }
    return caches.get(cacheName);
  };

  /**
   * Stores a value in a specified cache
   * @param {string} cacheName - Name of the cache to use
   * @param {string|Object} key - Key or object to store the value under
   * @param {any} value - Value to store
   * @param {boolean} useEncoding - Whether to encode the object key
   * @returns {any} The stored value
   */
  const set = (cacheName, key, value, useEncoding = false) => {
    const cache = getCache(cacheName);
    
    // If the key is an object and encoding is requested, use the encoder
    const actualKey = (useEnhancedFeatures && useEncoding && typeof key === 'object')
      ? getEncoder(cacheName).createHash(getEncoder(cacheName).encode(key))
      : key;
      
    cache.set(actualKey, value);
    return value;
  };

  /**
   * Retrieves a value from a specified cache
   * @param {string} cacheName - Name of the cache to use
   * @param {string|Object} key - Key to retrieve
   * @param {boolean} useEncoding - Whether to encode the object key
   * @returns {any|undefined} The stored value or undefined if not found
   */
  const get = (cacheName, key, useEncoding = false) => {
    const cache = getCache(cacheName);
    
    // If the key is an object and encoding is requested, use the encoder
    const actualKey = (useEnhancedFeatures && useEncoding && typeof key === 'object')
      ? getEncoder(cacheName).createHash(getEncoder(cacheName).encode(key))
      : key;
      
    return cache.get(actualKey);
  };

  /**
   * Checks if a key exists in a specified cache
   * @param {string} cacheName - Name of the cache to use
   * @param {string|Object} key - Key to check
   * @param {boolean} useEncoding - Whether to encode the object key
   * @returns {boolean} True if the key exists in the cache
   */
  const has = (cacheName, key, useEncoding = false) => {
    const cache = getCache(cacheName);
    
    // If the key is an object and encoding is requested, use the encoder
    const actualKey = (useEnhancedFeatures && useEncoding && typeof key === 'object')
      ? getEncoder(cacheName).createHash(getEncoder(cacheName).encode(key))
      : key;
      
    return cache.has(actualKey);
  };

  /**
   * Clears all values from a specified cache
   * @param {string} cacheName - Name of the cache to clear
   */
  const clear = (cacheName) => {
    const cache = getCache(cacheName);
    cache.clear();
    
    // Clear the encoder cache if it exists
    if (useEnhancedFeatures && encoders.has(cacheName)) {
      encoders.get(cacheName).clearCache();
    }
  };

  /**
   * Clears all caches
   */
  const clearAll = () => {
    caches.forEach(cache => cache.clear());
    
    // Clear all encoder caches if enhanced features are enabled
    if (useEnhancedFeatures) {
      encoders.forEach(encoder => encoder.clearCache());
    }
  };

  /**
   * Removes a specific key from a cache
   * @param {string} cacheName - Name of the cache to use
   * @param {string|Object} key - Key to remove
   * @param {boolean} useEncoding - Whether to encode the object key
   * @returns {boolean} True if the key was removed, false if it didn't exist
   */
  const remove = (cacheName, key, useEncoding = false) => {
    const cache = getCache(cacheName);
    
    // If the key is an object and encoding is requested, use the encoder
    const actualKey = (useEnhancedFeatures && useEncoding && typeof key === 'object')
      ? getEncoder(cacheName).createHash(getEncoder(cacheName).encode(key))
      : key;
      
    return cache.delete(actualKey);
  };

  /**
   * Gets all keys from a specified cache
   * @param {string} cacheName - Name of the cache to use
   * @returns {Array} Array of keys in the cache
   */
  const keys = (cacheName) => {
    const cache = getCache(cacheName);
    return Array.from(cache.keys());
  };

  /**
   * Gets the size of a specified cache
   * @param {string} cacheName - Name of the cache to use
   * @returns {number} Number of entries in the cache
   */
  const size = (cacheName) => {
    const cache = getCache(cacheName);
    return cache.size;
  };

  // Build the base module with original functionality
  const module = {
    set,
    get,
    has,
    clear,
    clearAll,
    remove,
    keys,
    size
  };

  // Add enhanced functionality if enabled
  if (useEnhancedFeatures) {
    // Find similar items in a cache using polygonal encoder
    module.getSimilar = (cacheName, queryObject, options = {}) => {
      const encoder = getEncoder(cacheName);
      const cache = getCache(cacheName);
      
      // Cache all objects for the encoder to compare against
      for (const [key, value] of cache.entries()) {
        if (typeof value === 'object' && value !== null) {
          encoder.cacheObject(value);
        }
      }
      
      // Return similar objects based on the query
      return encoder.lookupSimilar(queryObject, options);
    };
    
    // Expose encoder configuration methods
    module.addTransformer = (cacheName, property, transformer) => {
      getEncoder(cacheName).addTransformer(property, transformer);
    };
    
    module.addMapping = (cacheName, category, mapping) => {
      getEncoder(cacheName).addMapping(category, mapping);
    };
    
    module.setWeight = (cacheName, property, weight) => {
      getEncoder(cacheName).setWeight(property, weight);
    };
    
    module.encodeKey = (cacheName, object) => {
      return getEncoder(cacheName).createHash(getEncoder(cacheName).encode(object));
    };
  }

  return module;
};

export { createCacheModule };