/**
 * Slapocero Main Application
 * Handles game initialization, user interactions, and game loop
 */

import { randInt, randChoiceAvoidLast, debounce, throttle, triggerHaptic, now, formatDuration } from './utils.js';
import { gameState, State } from './state.js';
import { audioManager } from './audio.js';

/**
 * Main Slapocero Game Application
 */
class SlapocerobankGame {
    constructor() {
        // DOM elements
        this.warthogSprite = null;
        this.warthogContainer = null;
        this.muteToggle = null;
        this.gameStatus = null;
        this.hitCounter = null;

        // Game state
        this.isInitialized = false;
        this.gameStartTime = null;
        this.stats = {
            hits: 0,
            totalGameTime: 0,
            sessionStart: now()
        };

        // Asset tracking
        this.idleImages = [];
        this.hitImages = [];
        this.lastIdleImage = null;
        this.lastHitImage = null;

        // Timers
        this.idleTimer = null;
        this.hitTimer = null;

        // Configuration (from project brief)
        this.config = {
            idleSwapInterval: { min: 3000, max: 7000 }, // 3-7 seconds
            hitDuration: { min: 1800, max: 3200 }, // 1.8-3.2 seconds
            debounceDelay: 100, // prevent rapid clicking during hit state
            grunts: {
                idle: { chance: 0.3, volume: 0.6 }, // 30% chance on idle swap
                hit: { volume: 0.8 }
            }
        };

        // Bind methods
        this.init = this.init.bind(this);
        this.handleWarthogInteraction = this.handleWarthogInteraction.bind(this);
        this.handleMuteToggle = this.handleMuteToggle.bind(this);
        this.handleKeyboard = this.handleKeyboard.bind(this);
        this.preloadImages = this.preloadImages.bind(this);
        this.showIdleFrame = this.showIdleFrame.bind(this);
        this.showHitFrame = this.showHitFrame.bind(this);
        this.scheduleNextIdleSwap = this.scheduleNextIdleSwap.bind(this);
        this.scheduleReturnFromHit = this.scheduleReturnFromHit.bind(this);

        // Create debounced interaction handler
        this.debouncedInteraction = debounce(this.handleWarthogInteraction, this.config.debounceDelay);
    }

    /**
     * Initialize the game application
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        console.log('Initializing Slapocero game...');

        try {
            // Get DOM elements
            this.getDOMElements();

            // Preload assets
            await this.preloadAssets();

            // Set up event listeners
            this.setupEventListeners();

            // Set up state machine listeners
            this.setupStateMachine();

            // Initialize UI
            this.initializeUI();

            // Start the game
            this.startGame();

            this.isInitialized = true;
            console.log('Slapocero game initialized successfully');

        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.showError('Failed to load game. Please refresh the page.');
        }
    }

    /**
     * Get references to DOM elements
     */
    getDOMElements() {
        this.warthogSprite = document.getElementById('warthogSprite');
        this.warthogContainer = document.querySelector('.warthog-container');
        this.muteToggle = document.getElementById('muteToggle');
        this.gameStatus = document.getElementById('gameStatus');
        this.hitCounter = document.getElementById('hitCounter');

        if (!this.warthogSprite || !this.warthogContainer) {
            throw new Error('Required DOM elements not found');
        }
    }

    /**
     * Preload all game assets
     */
    async preloadAssets() {
        console.log('Preloading assets...');

        // Preload images
        await this.preloadImages();

        // Note: Audio loading will happen on first user interaction
        // due to browser autoplay policies

        console.log('Assets preloaded successfully');
    }

    /**
     * Preload sprite images
     */
    async preloadImages() {
        const imagePromises = [];

        // Preload idle images (1-6)
        for (let i = 1; i <= 6; i++) {
            const path = `assets/img/slapocero_idle_${i.toString().padStart(2, '0')}.png`;
            imagePromises.push(this.loadImage(path));
        }

        // Preload hit images (7-12)
        for (let i = 7; i <= 12; i++) {
            const path = `assets/img/slapocero_hit_${i.toString().padStart(2, '0')}.png`;
            imagePromises.push(this.loadImage(path));
        }

        const loadedImages = await Promise.allSettled(imagePromises);

        // Separate into idle and hit arrays
        for (let i = 0; i < 6; i++) {
            if (loadedImages[i].status === 'fulfilled') {
                this.idleImages.push(loadedImages[i].value);
            }
        }

        for (let i = 6; i < 12; i++) {
            if (loadedImages[i].status === 'fulfilled') {
                this.hitImages.push(loadedImages[i].value);
            }
        }

        console.log(`Loaded ${this.idleImages.length} idle images and ${this.hitImages.length} hit images`);

        if (this.idleImages.length === 0) {
            throw new Error('No idle images could be loaded');
        }
    }

    /**
     * Load a single image
     */
    loadImage(path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(path);
            img.onerror = () => reject(new Error(`Failed to load image: ${path}`));
            img.src = path;
        });
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Warthog interaction (click/tap)
        this.warthogContainer.addEventListener('click', this.debouncedInteraction);
        this.warthogContainer.addEventListener('touchend', (e) => {
            e.preventDefault(); // Prevent click event on mobile
            this.debouncedInteraction();
        });

        // Keyboard support
        this.warthogContainer.addEventListener('keydown', this.handleKeyboard);

        // Mute toggle
        if (this.muteToggle) {
            this.muteToggle.addEventListener('click', this.handleMuteToggle);
        }

        // Initialize audio on first user interaction
        document.addEventListener('click', this.initializeAudioOnce, { once: true });
        document.addEventListener('touchend', this.initializeAudioOnce, { once: true });
        document.addEventListener('keydown', this.initializeAudioOnce, { once: true });
    }

    /**
     * Initialize audio system on first user interaction
     */
    initializeAudioOnce = async () => {
        try {
            console.log('Initializing audio system...');

            // Define audio map based on project brief
            const audioMap = {
                grunt_idle_01: 'assets/audio/grunt_idle_01',
                grunt_idle_02: 'assets/audio/grunt_idle_02',
                grunt_idle_03: 'assets/audio/grunt_idle_03',
                grunt_hit_01: 'assets/audio/grunt_hit_01',
                grunt_hit_02: 'assets/audio/grunt_hit_02',
                grunt_hit_03: 'assets/audio/grunt_hit_03',
                slap_ciaf_01: 'assets/audio/slap_ciaf_01',
                slap_ciaf_02: 'assets/audio/slap_ciaf_02',
                slap_ciaf_03: 'assets/audio/slap_ciaf_03',
                slap_ciaf_04: 'assets/audio/slap_ciaf_04',
                slap_ciaf_05: 'assets/audio/slap_ciaf_05',
                slap_ciaf_06: 'assets/audio/slap_ciaf_06',
                slap_ciaf_07: 'assets/audio/slap_ciaf_07',
                slap_ciaf_08: 'assets/audio/slap_ciaf_08'
            };

            await audioManager.loadAudioMap(audioMap);
            console.log('Audio system initialized');

        } catch (error) {
            console.warn('Audio initialization failed (continuing without audio):', error);
        }
    }

    /**
     * Set up state machine event listeners
     */
    setupStateMachine() {
        gameState.on('stateChange', (data) => {
            this.updateAccessibilityStatus(data.to);
            console.log(`State changed: ${data.from} → ${data.to}`);
        });

        gameState.on('enter:idle', () => {
            this.showIdleFrame();
            this.scheduleNextIdleSwap();
        });


        gameState.on('enter:hit', () => {
            this.showHitFrame();
            this.playHitSounds();
            this.incrementHitCounter();
            this.triggerHitFeedback();
            this.scheduleReturnFromHit();
        });
    }

    /**
     * Initialize UI elements
     */
    initializeUI() {
        // Set initial mute button state
        this.updateMuteButton();

        // Update hit counter
        this.updateHitCounter();

        // Show initial idle frame
        this.showIdleFrame();
    }

    /**
     * Start the game
     */
    startGame() {
        this.gameStartTime = now();
        this.stats.sessionStart = this.gameStartTime;

        // Start in idle state
        gameState.goToIdle();

        console.log('Game started');
    }

    /**
     * Handle warthog interaction (click/tap)
     */
    handleWarthogInteraction() {
        // Only respond if in idle state
        if (gameState.isIdle()) {
            gameState.goToHit();
        }
    }

    /**
     * Handle keyboard interaction
     */
    handleKeyboard(event) {
        if (event.code === 'Space' || event.code === 'Enter') {
            event.preventDefault();
            this.handleWarthogInteraction();
        }
    }

    /**
     * Handle mute toggle
     */
    handleMuteToggle() {
        audioManager.toggleMute();
        this.updateMuteButton();
    }

    /**
     * Update mute button appearance
     */
    updateMuteButton() {
        if (!this.muteToggle) return;

        const soundIcon = this.muteToggle.querySelector('.icon-sound');
        const muteIcon = this.muteToggle.querySelector('.icon-mute');

        if (audioManager.isMutedState()) {
            soundIcon.style.display = 'none';
            muteIcon.style.display = 'inline';
            this.muteToggle.setAttribute('aria-label', 'Unmute sound');
        } else {
            soundIcon.style.display = 'inline';
            muteIcon.style.display = 'none';
            this.muteToggle.setAttribute('aria-label', 'Mute sound');
        }
    }

    /**
     * Show a random idle frame
     */
    showIdleFrame(animate = false) {
        if (this.idleImages.length === 0) return;

        const imagePath = randChoiceAvoidLast(this.idleImages, this.lastIdleImage);
        this.lastIdleImage = imagePath;

        this.warthogSprite.src = imagePath;

        if (animate) {
            this.warthogSprite.classList.add('idle-animation');
            setTimeout(() => {
                this.warthogSprite.classList.remove('idle-animation');
            }, 300);
        }
    }

    /**
     * Show a random hit frame
     */
    showHitFrame() {
        if (this.hitImages.length === 0) {
            // Fallback to idle if no hit images
            this.showIdleFrame();
            return;
        }

        const imagePath = randChoiceAvoidLast(this.hitImages, this.lastHitImage);
        this.lastHitImage = imagePath;

        this.warthogSprite.src = imagePath;
        this.warthogSprite.classList.add('hit-animation');

        setTimeout(() => {
            this.warthogSprite.classList.remove('hit-animation');
        }, 150);
    }

    /**
     * Schedule next idle animation swap
     */
    scheduleNextIdleSwap() {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
        }

        const delay = randInt(this.config.idleSwapInterval.min, this.config.idleSwapInterval.max);

        this.idleTimer = setTimeout(() => {
            if (gameState.isState(State.IDLE)) {
                // Show new idle frame with animation and possibly play grunt
                this.showIdleFrame(true);
                this.playIdleGrunt();

                // Schedule next swap
                this.scheduleNextIdleSwap();
            }
        }, delay);
    }

    /**
     * Schedule return from hit state to idle
     */
    scheduleReturnFromHit() {
        if (this.hitTimer) {
            clearTimeout(this.hitTimer);
        }

        const delay = randInt(this.config.hitDuration.min, this.config.hitDuration.max);

        this.hitTimer = setTimeout(() => {
            if (gameState.isState(State.HIT)) {
                gameState.goToIdle();
            }
        }, delay);
    }

    /**
     * Play idle grunt sound
     */
    async playIdleGrunt() {
        if (Math.random() < this.config.grunts.idle.chance) {
            try {
                await audioManager.random('grunt_idle', {
                    volume: this.config.grunts.idle.volume
                });
            } catch (error) {
                console.warn('Failed to play idle grunt:', error);
            }
        }
    }

    /**
     * Play hit sounds (grunt + slap)
     */
    async playHitSounds() {
        try {
            // Play random slap sound
            audioManager.random('slap_ciaf', { volume: 0.9 });

            // Play hit grunt with slight delay
            setTimeout(() => {
                audioManager.random('grunt_hit', {
                    volume: this.config.grunts.hit.volume
                });
            }, 50);

        } catch (error) {
            console.warn('Failed to play hit sounds:', error);
        }
    }

    /**
     * Trigger haptic feedback and visual effects for hit
     */
    triggerHitFeedback() {
        // Haptic feedback
        triggerHaptic([10]);

        // Add temporary visual effect to container
        this.warthogContainer.style.transform = 'scale(0.98)';
        setTimeout(() => {
            this.warthogContainer.style.transform = '';
        }, 100);
    }

    /**
     * Increment hit counter and update display
     */
    incrementHitCounter() {
        this.stats.hits++;
        this.updateHitCounter();
    }

    /**
     * Update hit counter display
     */
    updateHitCounter() {
        if (this.hitCounter) {
            this.hitCounter.textContent = this.stats.hits;
        }
    }

    /**
     * Update accessibility status
     */
    updateAccessibilityStatus(state) {
        if (!this.gameStatus) return;

        const statusText = {
            [State.IDLE]: 'Warthog is idle',
            [State.HIT]: 'Slap! Warthog reacted'
        };

        this.gameStatus.textContent = statusText[state] || 'Warthog is idle';
    }

    /**
     * Show error message to user
     */
    showError(message) {
        console.error(message);

        // Create simple error display
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ff6b6b;
            color: white;
            padding: 20px;
            border-radius: 10px;
            z-index: 1000;
            text-align: center;
            font-family: Arial, sans-serif;
        `;
        errorDiv.textContent = message;

        document.body.appendChild(errorDiv);

        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    /**
     * Get game statistics
     */
    getStats() {
        const currentTime = now();
        const sessionDuration = currentTime - this.stats.sessionStart;

        return {
            ...this.stats,
            sessionDuration,
            sessionDurationFormatted: formatDuration(sessionDuration),
            averageTimeBetweenHits: this.stats.hits > 1 ? sessionDuration / this.stats.hits : 0,
            hitsPerMinute: this.stats.hits > 0 ? (this.stats.hits / (sessionDuration / 60000)) : 0,
            currentState: gameState.getCurrentState(),
            stateStats: gameState.getStats(),
            audioInfo: audioManager.getInfo()
        };
    }

    /**
     * Export stats as JSON (for optional telemetry)
     */
    exportStats() {
        const stats = this.getStats();
        const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `slapocero-stats-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();

        URL.revokeObjectURL(url);
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
        }

        if (this.hitTimer) {
            clearTimeout(this.hitTimer);
        }

        audioManager.cleanup();
        gameState.reset();
    }
}

// Create and initialize the game
const game = new SlapocerobankGame();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => game.init());
} else {
    game.init();
}

// Export for debugging and potential testing
window.slapocerobankGame = game;
window.gameState = gameState;
window.audioManager = audioManager;

// Handle page unload
window.addEventListener('beforeunload', () => {
    game.cleanup();
});

// Console welcome message
console.log(`
🐗 Slapocero Game Loaded! 🐗
- Tap the warthog to slap it!
- Type 'slapocerobankGame.getStats()' for game statistics
- Type 'slapocerobankGame.exportStats()' to download stats
`);
