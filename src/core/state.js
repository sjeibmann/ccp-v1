const state = new Proxy({}, {
  get: (target, property) => {
    return target[property];
  },
  set: (target, property, value) => {
    const oldValue = target[property];
    target[property] = value;
    
    // Emit change event for specific property
    window.dispatchEvent(new CustomEvent(`state:change:${property}`, { 
      detail: { 
        key: property, 
        value, 
        oldValue 
      } 
    }));
    
    // Emit generic change event
    window.dispatchEvent(new CustomEvent('state:change', {
      detail: { key: property, value, oldValue }
    }));
    
    return true;
  }
});

// Subscriptions management
const subscriptions = {};

/**
 * Get a value from the state
 * @param {string} key - The state key to retrieve
 * @returns {*} The value stored at that key
 */
export function get(key) {
  return state[key];
}

/**
 * Set a value in the state
 * @param {string} key - The state key to set
 * @param {*} value - The value to store
 */
export function set(key, value) {
  state[key] = value;
}

/**
 * Subscribe to state changes for a specific key
 * @param {string} key - The state key to subscribe to
 * @param {Function} callback - Function to call when value changes
 * @returns {Function} Unsubscribe function
 */
export function subscribe(key, callback) {
  const handler = (event) => {
    if (event.detail.key === key) {
      callback(event.detail.value, event.detail.oldValue);
    }
  };
  
  window.addEventListener(`state:change:${key}`, handler);
  
  // Store subscription for unsubscribe
  if (!subscriptions[key]) {
    subscriptions[key] = [];
  }
  subscriptions[key].push(handler);
  
  // Return unsubscribe function
  return () => {
    unsubscribe(key, callback);
  };
}

/**
 * Subscribe to all state changes
 * @param {Function} callback - Function to call when any value changes
 * @returns {Function} Unsubscribe function
 */
export function subscribeAll(callback) {
  const handler = (event) => {
    callback(event.detail.key, event.detail.value, event.detail.oldValue);
  };
  
  window.addEventListener('state:change', handler);
  
  subscriptions.__all__ = subscriptions.__all__ || [];
  subscriptions.__all__.push(handler);
  
  return () => {
    unsubscribeAll(callback);
  };
}

/**
 * Unsubscribe from state changes
 * @param {string} key - The state key to unsubscribe from
 * @param {Function} callback - The callback to remove
 */
export function unsubscribe(key, callback) {
  const handlers = subscriptions[key] || [];
  const handlerIndex = handlers.indexOf(callback);
  
  if (handlerIndex !== -1) {
    const handler = handlers[handlerIndex];
    window.removeEventListener(`state:change:${key}`, handler);
    handlers.splice(handlerIndex, 1);
  }
  
  if (handlers.length === 0) {
    delete subscriptions[key];
  }
}

/**
 * Unsubscribe all callbacks
 * @param {string} [key] - Optional specific key, or all if not provided
 */
export function unsubscribeAll(key) {
  if (key && subscriptions[key]) {
    subscriptions[key].forEach(handler => {
      window.removeEventListener(`state:change:${key}`, handler);
    });
    delete subscriptions[key];
  } else {
    // Unsubscribe from all
    Object.keys(subscriptions).forEach(subKey => {
      subscriptions[subKey].forEach(handler => {
        if (subKey === '__all__') {
          window.removeEventListener('state:change', handler);
        } else {
          window.removeEventListener(`state:change:${subKey}`, handler);
        }
      });
    });
    Object.keys(subscriptions).forEach(key => delete subscriptions[key]);
  }
}

/**
 * Check if a key exists in state
 * @param {string} key - The state key to check
 * @returns {boolean} Whether the key exists
 */
export function has(key) {
  return key in state;
}

/**
 * Remove a key from state
 * @param {string} key - The state key to remove
 * @returns {boolean} Whether the key was removed
 */
export function remove(key) {
  if (key in state) {
    const oldValue = state[key];
    delete state[key];
    window.dispatchEvent(new CustomEvent(`state:change:${key}`, {
      detail: { key, value: undefined, oldValue }
    }));
    return true;
  }
  return false;
}

/**
 * Clear all state
 */
export function clear() {
  const keys = Object.keys(state);
  keys.forEach(key => {
    const oldValue = state[key];
    delete state[key];
    window.dispatchEvent(new CustomEvent(`state:change:${key}`, {
      detail: { key, value: undefined, oldValue }
    }));
  });
}
