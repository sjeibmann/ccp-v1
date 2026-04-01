/**
 * Simple event bus for component communication
 * Uses the browser's EventTarget for event management
 */
class EventBus {
  constructor() {
    this.eventTarget = new EventTarget();
  }

  /**
   * Dispatch an event
   * @param {string} type - Event type name
   * @param {EventInit} [detail] - Event details
   * @returns {boolean} False if event was cancelled, true otherwise
   */
  dispatch(type, detail = {}) {
    const event = new CustomEvent(type, { detail });
    return this.eventTarget.dispatchEvent(event);
  }

  /**
   * Add event listener
   * @param {string} type - Event type to listen for
   * @param {EventListenerOrEventListenerObject} callback - Event handler
   * @param {boolean|AddEventListenerOptions} [options] - Event options
   */
  on(type, callback, options = false) {
    this.eventTarget.addEventListener(type, callback, options);
  }

  /**
   * Add event listener that fires only once
   * @param {string} type - Event type to listen for
   * @param {EventListenerOrEventListenerObject} callback - Event handler
   * @param {boolean|AddEventListenerOptions} [options] - Event options
   */
  once(type, callback, options = false) {
    this.eventTarget.addEventListener(type, callback, { ...options, once: true });
  }

  /**
   * Remove event listener
   * @param {string} type - Event type
   * @param {EventListenerOrEventListenerObject} callback - Event handler
   * @param {boolean|EventListenerOptions} [options] - Event options
   */
  off(type, callback, options = false) {
    this.eventTarget.removeEventListener(type, callback, options);
  }

  /**
   * Remove all event listeners for a type
   * @param {string} [type] - Event type, removes all if not provided
   */
  clear(type) {
    if (type) {
      // Get all listeners for this type and remove them
      // This is a simplified approach - In production, track listeners
      const event = new CustomEvent(type);
      // Can't easily remove all without tracking - use WeakMap in production
      console.warn('EventBus: To cleanAll listeners, track them manually');
    } else {
      console.warn('EventBus: To clear all, track listeners externally');
    }
  }
}

// Export singleton instance
export const events = new EventBus();

// Also export for direct use if preferred
export { EventBus };
