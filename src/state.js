/**
 * Finite State Machine for Slapocero game
 * Manages warthog character states: IDLE, IDLE_ANIMATE, HIT
 */

import { EventEmitter } from './utils.js';

// Define possible states
export const State = {
    IDLE: 'idle',
    HIT: 'hit'
};

/**
 * State Machine class to manage game state transitions
 */
export class StateMachine extends EventEmitter {
    constructor() {
        super();
        this.currentState = State.IDLE;
        this.previousState = null;
        this.stateStartTime = performance.now();
        this.transitionHistory = [];
        
        // Bind methods to maintain context
        this.setState = this.setState.bind(this);
        this.getCurrentState = this.getCurrentState.bind(this);
        this.canTransition = this.canTransition.bind(this);
    }
    
    /**
     * Get the current state
     * @returns {string} Current state
     */
    getCurrentState() {
        return this.currentState;
    }
    
    /**
     * Get the previous state
     * @returns {string|null} Previous state
     */
    getPreviousState() {
        return this.previousState;
    }
    
    /**
     * Get time spent in current state
     * @returns {number} Time in milliseconds
     */
    getTimeInState() {
        return performance.now() - this.stateStartTime;
    }
    
    /**
     * Check if a state transition is valid
     * @param {string} fromState - Current state
     * @param {string} toState - Target state
     * @returns {boolean} True if transition is valid
     */
    canTransition(fromState, toState) {
        // Define valid state transitions based on project brief
        const validTransitions = {
            [State.IDLE]: [State.HIT],
            [State.HIT]: [State.IDLE]
        };
        
        return validTransitions[fromState]?.includes(toState) || false;
    }
    
    /**
     * Set a new state with validation and event emission
     * @param {string} newState - The state to transition to
     * @param {Object} data - Optional data to pass with the state change
     * @returns {boolean} True if state was changed successfully
     */
    setState(newState, data = {}) {
        // Validate state
        if (!Object.values(State).includes(newState)) {
            console.error(`Invalid state: ${newState}`);
            return false;
        }
        
        // Check if transition is valid
        if (!this.canTransition(this.currentState, newState)) {
            console.warn(`Invalid transition from ${this.currentState} to ${newState}`);
            return false;
        }
        
        // Don't emit if we're already in that state (unless forced)
        if (this.currentState === newState && !data.force) {
            return false;
        }
        
        // Store previous state
        this.previousState = this.currentState;
        const timeInPreviousState = this.getTimeInState();
        
        // Update current state
        this.currentState = newState;
        this.stateStartTime = performance.now();
        
        // Add to transition history (keep last 10 transitions)
        this.transitionHistory.push({
            from: this.previousState,
            to: this.currentState,
            timestamp: this.stateStartTime,
            timeInPreviousState,
            data: { ...data }
        });
        
        if (this.transitionHistory.length > 10) {
            this.transitionHistory.shift();
        }
        
        // Emit state change event
        this.emit('stateChange', {
            from: this.previousState,
            to: this.currentState,
            timeInPreviousState,
            data
        });
        
        // Emit specific state events
        this.emit(`enter:${this.currentState}`, data);
        
        if (this.previousState) {
            this.emit(`exit:${this.previousState}`, {
                to: this.currentState,
                timeInState: timeInPreviousState
            });
        }
        
        console.log(`State transition: ${this.previousState} → ${this.currentState}`, data);
        
        return true;
    }
    
    /**
     * Check if currently in a specific state
     * @param {string} state - State to check
     * @returns {boolean} True if in the specified state
     */
    isState(state) {
        return this.currentState === state;
    }
    
    /**
     * Check if currently in any of the specified states
     * @param {Array<string>} states - Array of states to check
     * @returns {boolean} True if in any of the specified states
     */
    isAnyState(states) {
        return states.includes(this.currentState);
    }
    
    /**
     * Check if in idle state
     * @returns {boolean} True if in idle state
     */
    isIdle() {
        return this.isState(State.IDLE);
    }
    
    /**
     * Force transition to idle state
     * @param {Object} data - Optional data
     */
    goToIdle(data = {}) {
        this.setState(State.IDLE, { ...data, force: true });
    }
    
    /**
     * Transition to hit state (if valid)
     * @param {Object} data - Optional data
     */
    goToHit(data = {}) {
        if (this.isIdle()) {
            this.setState(State.HIT, data);
        }
    }
    
    
    /**
     * Get transition history
     * @returns {Array} Array of transition objects
     */
    getTransitionHistory() {
        return [...this.transitionHistory];
    }
    
    /**
     * Reset state machine to initial state
     */
    reset() {
        this.currentState = State.IDLE;
        this.previousState = null;
        this.stateStartTime = performance.now();
        this.transitionHistory = [];
        
        this.emit('reset');
        console.log('State machine reset to IDLE');
    }
    
    /**
     * Get state machine statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        const history = this.transitionHistory;
        const totalTransitions = history.length;
        
        // Count transitions by type
        const transitionCounts = {};
        history.forEach(transition => {
            const key = `${transition.from} → ${transition.to}`;
            transitionCounts[key] = (transitionCounts[key] || 0) + 1;
        });
        
        // Calculate time spent in each state
        const timeInStates = {};
        history.forEach(transition => {
            if (transition.from) {
                timeInStates[transition.from] = (timeInStates[transition.from] || 0) + transition.timeInPreviousState;
            }
        });
        
        return {
            currentState: this.currentState,
            timeInCurrentState: this.getTimeInState(),
            totalTransitions,
            transitionCounts,
            timeInStates,
            transitionHistory: history
        };
    }
}

// Create and export a default instance
export const gameState = new StateMachine();

// Export state constants for convenience
export { State as GameState };