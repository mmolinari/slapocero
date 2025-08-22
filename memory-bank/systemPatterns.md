# System Patterns

This file documents recurring patterns and standards used in the project.
It is optional, but recommended to be updated as the project evolves.

## Coding Patterns

* **ES Module Structure**: Each module exports specific functionality with clear, single-responsibility interfaces
* **State Pattern Implementation**: Central state management with explicit state transitions and validation
* **Asset Preloading Pattern**: Promise-based asset loading with error handling and fallback strategies
* **Event Handling Pattern**: Debounced user input handling to prevent rapid-fire interactions
* **Random Selection Pattern**: Utility functions for weighted randomization and avoiding consecutive repeats
* **Audio Management Pattern**: Centralized audio loading, caching, and playback with format fallbacks

## Architectural Patterns

* **Finite State Machine**: Clear state definitions with explicit transition rules and guards
* **Module Separation**: Domain-specific modules (state, audio, utils) with minimal cross-dependencies
* **Progressive Enhancement**: Core functionality works without audio, enhanced experience with full features
* **Cache-First PWA**: Offline-first approach with intelligent cache invalidation strategies
* **Responsive Design**: Mobile-first approach with touch-friendly interaction zones
* **Performance-First**: Minimize DOM manipulation, use efficient event delegation, optimize asset loading

## Testing Patterns

* **Manual Testing Protocol**: Systematic testing of state transitions and user interaction flows
* **Performance Benchmarking**: Frame rate monitoring and audio latency measurement
* **Cross-Browser Validation**: Testing audio formats and PWA functionality across platforms
* **Offline Testing**: Service worker cache validation and offline functionality verification
* **Mobile Testing**: Touch interaction, haptic feedback, and mobile-specific behavior validation

2025-08-22 22:09:13 - Initial system patterns documented for Slapocero project architecture