/**
 * Utility functions for Slapocero game
 * Provides random number generation, array selection, and debouncing utilities
 */

/**
 * Generate a random integer between min and max (inclusive)
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {number} Random integer between min and max
 */
export function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random float between min and max
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random float between min and max
 */
export function randFloat(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Choose a random element from an array
 * @param {Array} array - Array to choose from
 * @returns {*} Random element from the array
 */
export function randChoice(array) {
    if (!Array.isArray(array) || array.length === 0) {
        throw new Error('randChoice requires a non-empty array');
    }
    return array[randInt(0, array.length - 1)];
}

/**
 * Choose a random element from an array, avoiding the last chosen element
 * @param {Array} array - Array to choose from
 * @param {*} lastChoice - Last chosen element to avoid
 * @returns {*} Random element from the array (different from lastChoice if possible)
 */
export function randChoiceAvoidLast(array, lastChoice) {
    if (!Array.isArray(array) || array.length === 0) {
        throw new Error('randChoiceAvoidLast requires a non-empty array');
    }
    
    if (array.length === 1) {
        return array[0];
    }
    
    const availableChoices = array.filter(item => item !== lastChoice);
    
    if (availableChoices.length === 0) {
        // If all items match lastChoice, just return a random one
        return randChoice(array);
    }
    
    return randChoice(availableChoices);
}

/**
 * Create a debounced version of a function
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Create a function that can only be called once
 * @param {Function} fn - Function to call only once
 * @returns {Function} Function that can only be called once
 */
export function once(fn) {
    let called = false;
    let result;
    
    return function (...args) {
        if (!called) {
            called = true;
            result = fn.apply(this, args);
        }
        return result;
    };
}

/**
 * Create a throttled version of a function
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(fn, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(start, end, t) {
    return start + (end - start) * clamp(t, 0, 1);
}

/**
 * Check if device supports haptic feedback
 * @returns {boolean} True if haptic feedback is supported
 */
export function supportsHaptics() {
    return 'vibrate' in navigator;
}

/**
 * Trigger haptic feedback if supported
 * @param {number|Array} pattern - Vibration pattern (duration or array of durations)
 */
export function triggerHaptic(pattern = 10) {
    if (supportsHaptics()) {
        navigator.vibrate(pattern);
    }
}

/**
 * Get a timestamp in milliseconds
 * @returns {number} Current timestamp
 */
export function now() {
    return performance.now();
}

/**
 * Format time duration in a readable format
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
export function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
}

/**
 * Simple event emitter for loosely coupled communication
 */
export class EventEmitter {
    constructor() {
        this.events = new Map();
    }
    
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    }
    
    off(event, callback) {
        if (this.events.has(event)) {
            const callbacks = this.events.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    emit(event, ...args) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }
}