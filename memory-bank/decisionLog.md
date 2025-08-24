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

[2025-08-23 07:57:50] - Image format change from PNG to JPEG
- **Change**: Updated asset loading paths from `.png` to `.jpeg` extensions
- **Files Modified**: `src/app.js` lines 143 and 149
- **Rationale**: User converted image assets from PNG to JPEG format for better compression/file size
- **Impact**: All 12 warthog sprites now load as JPEG files instead of PNG files
- **Old PNG files**: Moved to archive/img/ directory for backup

[2025-08-23 17:42:23] - Fixed iOS PWA 404 issue for GitHub Pages deployment
- **Problem**: PWA failed to launch from iOS home screen with 404 error when published at https://mmolinari.github.io/slapocero
- **Root Cause**: Manifest and service worker used root paths (/) instead of GitHub Pages subpath (/slapocero/)
- **Solution**: Updated all absolute paths to include /slapocero/ prefix
- **Files Modified**:
  - `pwa/manifest.json`: Updated start_url, scope, icon paths, screenshot path, and shortcut URL
  - `pwa/service-worker.js`: Updated CACHE_ASSETS array and path detection functions
  - `index.html`: Updated preload links and main image src from PNG to JPEG format
- **Additional Fix**: Corrected image format references from .png to .jpeg throughout all files
- **Result**: PWA will now properly launch from iOS home screen at correct GitHub Pages URL

[2025-08-23 22:27:24] - PWA icons created for mobile app installation
- **Problem**: PWA manifest referenced missing icon files (icon-192.png, icon-512.png)
- **Solution**: Created PWA icons using existing character sprite as base image
- **Base Image**: Used slapocero_idle_01.jpeg (1024x1536) as source material
- **Process**: 
  - Installed ImageMagick via Homebrew for image processing
  - Created 192x192px PNG icon with centered crop and theme background (#f3e8d2)
  - Created 512x512px PNG icon with same processing approach
- **Technical Details**:
  - Used `magick` command with `-resize NxN^` (fill), `-gravity center` (crop center), `-extent NxN` (canvas size)
  - Applied app theme background color for maskable icon compliance
- **Files Created**: assets/icons/icon-192.png (46KB), assets/icons/icon-512.png (319KB)
- **Impact**: PWA can now be properly installed on mobile devices with recognizable warthog character icon

[2025-08-24 14:34:00] - Loading indicator implementation completed successfully
- **Feature**: Added comprehensive loading screen with progress tracking for asset preloading
- **Components Added**: 
  - HTML structure with loading overlay, progress bar, percentage display, and status text
  - CSS styling matching game aesthetic with animations and responsive design
  - JavaScript progress tracking for 26 total assets (12 images + 14 audio files)
- **Technical Implementation**:
  - `showLoader()` and `hideLoader()` methods for loading screen management
  - `updateProgress()` and `incrementAssetProgress()` for real-time progress updates
  - Modified `preloadImages()` and `preloadAudio()` to provide granular progress feedback
  - Progressive status messages: "Loading images..." (0-46%) and "Loading audio..." (46-100%)
- **User Experience**: 
  - Full-screen overlay prevents premature interaction during loading
  - Smooth progress animations with shimmer effects
  - Clear visual and textual feedback showing exact loading progress
  - Proper fade-out transition when loading completes
- **Testing Results**: Successfully tested with local server, all 26 assets load progressively with accurate progress reporting
- **Compatibility**: Responsive design works on mobile and desktop, supports dark mode and reduced motion preferences

[2025-08-24 18:27:00] - iOS Haptic Feedback Enhancement Implementation Completed
- **Feature**: Added comprehensive iOS 18+ haptic feedback support using checkbox switch workaround
- **Problem Solved**: Safari iOS doesn't support standard Vibration API, limiting haptic feedback in PWA
- **Solution**: Multi-tier haptic system with iOS checkbox switch workaround fallback
- **Technical Implementation**:
  - Enhanced `triggerHaptic()` function in `src/utils.js` with 3-tier fallback system
  - Tier 1: Standard `navigator.vibrate()` API (existing Android/browser support)
  - Tier 2: iOS 18+ checkbox switch workaround (Safari 17.4+ feature detection)
  - Tier 3: Graceful degradation (no haptic feedback)
- **iOS Workaround Method**: Creates temporary hidden `<label>` with `<input type="checkbox" switch>`, programmatically clicks it to trigger iOS native haptic feedback, then immediately cleans up DOM elements
- **Pattern Support**: Basic haptic (single), confirm pattern (double with delay), error pattern (triple with delays)
- **Device Detection**: iOS Safari user agent detection + feature detection for switch input support
- **Backward Compatibility**: Existing `triggerHaptic([10])` calls work unchanged with enhanced functionality
- **Testing Results**: Successfully tested with local server, haptic feedback integrates seamlessly with warthog slap interactions
- **Performance**: Zero dependencies, minimal DOM manipulation, silent error handling, proper resource cleanup