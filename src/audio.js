/**
 * Audio system for Slapocero game
 * Handles Web Audio API with HTML5 Audio fallback
 * Supports multiple audio formats and preloading
 */

import { randChoice } from './utils.js';

/**
 * Audio manager class with Web Audio API and fallback support
 */
export class AudioManager {
    constructor() {
        this.audioContext = null;
        this.audioBuffers = new Map();
        this.audioElements = new Map();
        this.useWebAudio = false;
        this.masterVolume = 1.0;
        this.isMuted = false;
        this.isInitialized = false;
        
        // Audio format preferences (order matters)
        this.supportedFormats = ['.mp3', '.ogg'];
        
        // Initialize on first user interaction
        this.initPromise = null;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.play = this.play.bind(this);
        this.loadAudioMap = this.loadAudioMap.bind(this);
    }
    
    /**
     * Initialize audio system (call on first user interaction)
     * @returns {Promise} Initialization promise
     */
    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }
        
        this.initPromise = this._initializeAudio();
        return this.initPromise;
    }
    
    /**
     * Internal audio initialization
     * @private
     */
    async _initializeAudio() {
        try {
            // Try to initialize Web Audio API
            if (window.AudioContext || window.webkitAudioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // Resume context if suspended (required by some browsers)
                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }
                
                this.useWebAudio = true;
                console.log('Web Audio API initialized successfully');
            } else {
                console.log('Web Audio API not supported, using HTML5 Audio fallback');
                this.useWebAudio = false;
            }
            
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.warn('Web Audio API initialization failed, falling back to HTML5 Audio:', error);
            this.useWebAudio = false;
            this.isInitialized = true;
            return true;
        }
    }
    
    /**
     * Detect the best supported audio format for a file
     * @param {string} basePath - Base path without extension
     * @returns {string} Full path with best supported extension
     */
    getBestAudioFormat(basePath) {
        const audio = new Audio();
        
        for (const format of this.supportedFormats) {
            const type = format === '.mp3' ? 'audio/mpeg' : 'audio/ogg';
            if (audio.canPlayType(type) !== '') {
                return `${basePath}${format}`;
            }
        }
        
        // Fallback to mp3 if nothing else works
        return `${basePath}.mp3`;
    }
    
    /**
     * Load audio files from a map of key-url pairs
     * @param {Object} audioMap - Map of {key: baseUrl} pairs
     * @returns {Promise} Promise that resolves when all audio is loaded
     */
    async loadAudioMap(audioMap) {
        await this.init();
        
        const loadPromises = Object.entries(audioMap).map(([key, basePath]) => {
            return this.loadAudio(key, basePath);
        });
        
        const results = await Promise.allSettled(loadPromises);
        
        // Log any failures
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                const key = Object.keys(audioMap)[index];
                console.warn(`Failed to load audio for key "${key}":`, result.reason);
            }
        });
        
        console.log(`Audio loading complete. Loaded ${results.filter(r => r.status === 'fulfilled').length}/${results.length} files`);
        
        return results;
    }
    
    /**
     * Load a single audio file
     * @param {string} key - Unique key for this audio
     * @param {string} basePath - Base path without extension
     * @returns {Promise} Promise that resolves when audio is loaded
     */
    async loadAudio(key, basePath) {
        const audioPath = this.getBestAudioFormat(basePath);
        
        try {
            if (this.useWebAudio && this.audioContext) {
                await this._loadWebAudio(key, audioPath);
            } else {
                await this._loadHtmlAudio(key, audioPath);
            }
            
            console.log(`Loaded audio: ${key} (${audioPath})`);
        } catch (error) {
            console.error(`Failed to load audio: ${key} (${audioPath})`, error);
            throw error;
        }
    }
    
    /**
     * Load audio using Web Audio API
     * @private
     */
    async _loadWebAudio(key, audioPath) {
        const response = await fetch(audioPath);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        
        this.audioBuffers.set(key, audioBuffer);
    }
    
    /**
     * Load audio using HTML5 Audio
     * @private
     */
    async _loadHtmlAudio(key, audioPath) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(audioPath);
            
            audio.addEventListener('canplaythrough', () => {
                this.audioElements.set(key, audio);
                resolve();
            }, { once: true });
            
            audio.addEventListener('error', (event) => {
                reject(new Error(`Audio load error: ${event.target.error?.message || 'Unknown error'}`));
            }, { once: true });
            
            // Start loading
            audio.preload = 'auto';
            audio.load();
        });
    }
    
    /**
     * Play an audio file
     * @param {string} key - Audio key to play
     * @param {Object} options - Playback options
     * @param {number} options.volume - Volume (0-1)
     * @param {number} options.detune - Detune in cents (Web Audio only)
     * @param {number} options.delay - Delay before playing in seconds
     * @returns {Promise} Promise that resolves when playback starts
     */
    async play(key, options = {}) {
        if (this.isMuted) {
            return Promise.resolve();
        }
        
        await this.init();
        
        const {
            volume = 1.0,
            detune = 0,
            delay = 0
        } = options;
        
        const finalVolume = volume * this.masterVolume;
        
        try {
            if (this.useWebAudio && this.audioBuffers.has(key)) {
                return this._playWebAudio(key, { volume: finalVolume, detune, delay });
            } else if (this.audioElements.has(key)) {
                return this._playHtmlAudio(key, { volume: finalVolume, delay });
            } else {
                throw new Error(`Audio not found: ${key}`);
            }
        } catch (error) {
            console.error(`Failed to play audio: ${key}`, error);
            throw error;
        }
    }
    
    /**
     * Play audio using Web Audio API
     * @private
     */
    _playWebAudio(key, { volume, detune, delay }) {
        const buffer = this.audioBuffers.get(key);
        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        
        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Set volume
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        
        // Set detune if supported
        if (source.detune && detune !== 0) {
            source.detune.setValueAtTime(detune, this.audioContext.currentTime);
        }
        
        // Start playback
        const startTime = this.audioContext.currentTime + delay;
        source.start(startTime);
        
        return Promise.resolve();
    }
    
    /**
     * Play audio using HTML5 Audio
     * @private
     */
    async _playHtmlAudio(key, { volume, delay }) {
        const audio = this.audioElements.get(key);
        
        // Clone audio element to allow overlapping plays
        const audioClone = audio.cloneNode();
        audioClone.volume = volume;
        
        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay * 1000));
        }
        
        return audioClone.play().catch(error => {
            console.warn(`HTML Audio play failed for ${key}:`, error);
        });
    }
    
    /**
     * Play a random audio from a key prefix
     * @param {string} keyPrefix - Prefix to match (e.g., 'grunt_idle')
     * @param {Object} options - Playback options
     * @returns {Promise} Promise that resolves when playback starts
     */
    async random(keyPrefix, options = {}) {
        const matchingKeys = [];
        
        // Check Web Audio buffers
        for (const key of this.audioBuffers.keys()) {
            if (key.startsWith(keyPrefix)) {
                matchingKeys.push(key);
            }
        }
        
        // Check HTML Audio elements
        for (const key of this.audioElements.keys()) {
            if (key.startsWith(keyPrefix) && !matchingKeys.includes(key)) {
                matchingKeys.push(key);
            }
        }
        
        if (matchingKeys.length === 0) {
            throw new Error(`No audio files found with prefix: ${keyPrefix}`);
        }
        
        const randomKey = randChoice(matchingKeys);
        return this.play(randomKey, options);
    }
    
    /**
     * Set master volume
     * @param {number} volume - Volume level (0-1)
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }
    
    /**
     * Get master volume
     * @returns {number} Current master volume
     */
    getMasterVolume() {
        return this.masterVolume;
    }
    
    /**
     * Mute or unmute audio
     * @param {boolean} muted - Whether to mute
     */
    setMuted(muted) {
        this.isMuted = Boolean(muted);
        
        // Store in localStorage
        try {
            localStorage.setItem('slapocero-muted', this.isMuted.toString());
        } catch (error) {
            console.warn('Failed to save mute preference:', error);
        }
    }
    
    /**
     * Check if audio is muted
     * @returns {boolean} True if muted
     */
    isMutedState() {
        return this.isMuted;
    }
    
    /**
     * Toggle mute state
     * @returns {boolean} New mute state
     */
    toggleMute() {
        this.setMuted(!this.isMuted);
        return this.isMuted;
    }
    
    /**
     * Load mute preference from localStorage
     */
    loadMutePreference() {
        try {
            const saved = localStorage.getItem('slapocero-muted');
            if (saved !== null) {
                this.isMuted = saved === 'true';
            }
        } catch (error) {
            console.warn('Failed to load mute preference:', error);
        }
    }
    
    /**
     * Get audio system info
     * @returns {Object} Audio system information
     */
    getInfo() {
        return {
            useWebAudio: this.useWebAudio,
            isInitialized: this.isInitialized,
            isMuted: this.isMuted,
            masterVolume: this.masterVolume,
            loadedBuffers: this.audioBuffers.size,
            loadedElements: this.audioElements.size,
            audioContext: this.audioContext ? {
                state: this.audioContext.state,
                sampleRate: this.audioContext.sampleRate
            } : null
        };
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        this.audioBuffers.clear();
        this.audioElements.clear();
    }
}

// Create and export default instance
export const audioManager = new AudioManager();

// Load mute preference on module load
audioManager.loadMutePreference();