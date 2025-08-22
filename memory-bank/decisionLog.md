# Decision Log

This file records architectural and implementation decisions using a list format.

## Decision

* **Technology Stack Selection**: Vanilla JavaScript with ES modules, no frameworks or bundlers
* **State Management Approach**: Finite state machine with simple state transitions (idle → idle-animate → hit → idle)
* **Audio System Architecture**: Web Audio API as primary with `<audio>` element fallback for compatibility
* **Asset Management Strategy**: Preload all images and audio files on app initialization for optimal performance
* **PWA Implementation**: Cache-first strategy for assets, network-first for HTML/JS files

## Rationale 

* **Vanilla JS Choice**: Ensures minimal dependencies, faster loading, and easier maintenance for a simple interactive app
* **State Machine Pattern**: Provides clear, predictable behavior for warthog character interactions and animations
* **Web Audio API Priority**: Offers better control over audio timing, volume, and effects crucial for responsive gameplay
* **Asset Preloading**: Eliminates loading delays during user interactions, ensuring immediate visual and audio feedback
* **PWA Cache Strategy**: Balances offline functionality with update capability for evolving features

## Implementation Details

* **Module Structure**: Separate concerns into state.js, audio.js, utils.js, and main app.js
* **Image Handling**: DOM-based `<img>` element swapping rather than canvas for simplicity
* **Timing System**: `requestAnimationFrame` for smooth transitions, `setTimeout` for state duration management
* **Audio Format Support**: Multiple formats (.mp3, .ogg) for cross-browser compatibility
* **Performance Optimization**: Minimize DOM reflows, use efficient event handling with debouncing

2025-08-22 22:08:44 - Initial architectural decisions documented based on project brief analysis

[2025-08-22 23:28:27] - Removed IDLE_ANIMATE state from finite state machine
- **Rationale**: Simplified state management by handling random sprite changes directly within IDLE state
- **Changes**: 
  - Eliminated IDLE_ANIMATE state from State enum and transition logic
  - Modified scheduleNextIdleSwap() to handle sprite changes and grunt sounds within IDLE state
  - Removed separate event listener for IDLE_ANIMATE state
  - Updated accessibility status text mapping
- **Benefits**: Cleaner state machine with only essential states (IDLE, HIT), easier maintenance, same functionality preserved

[2025-08-22 23:53:13] - Fixed idle animation startup issue
- **Problem**: Idle images only started changing after the first hit, not immediately on game load
- **Root Cause**: State machine blocked IDLE → IDLE transitions, so `'enter:idle'` event never fired on startup
- **Solution**: Modified state machine to bypass transition validation when using `force: true`
- **Changes**:
  - Modified `setState()` in `src/state.js` to skip `canTransition()` check when `data.force` is true
  - This allows `goToIdle({ force: true })` to properly trigger `'enter:idle'` event even when already in IDLE state
  - Reverted unnecessary complexity in `src/app.js`
- **Result**: `'enter:idle'` event now fires on startup, immediately starting idle animation cycle