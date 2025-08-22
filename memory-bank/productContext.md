# Product Context

This file provides a high-level overview of the Slapocero project and the expected product that will be created. Based upon projectBrief.md and all other available project-related information in the working directory. This file is intended to be updated as the project evolves, and should be used to inform all other modes of the project's goals and context.

## Project Goal

Create "Slapocero" - a playful micro web app featuring a cartoon warthog seen from behind that wiggles around while idle. When users tap/click on the rear, it reacts with funny faces and surprised expressions. Built entirely with vanilla JS, minimal CSS, and pre-prepared raster assets, with optional PWA installation for offline mobile play.

## Key Features

* **Interactive Warthog Character**: Finite state machine with idle and hit states
* **Visual Feedback**: 12 pre-prepared sprite images (6 idle, 6 hit reactions)
* **Audio Integration**: Context-appropriate grunts and slap sounds with Web Audio API
* **Responsive Timing**: Random intervals for idle animation (3-7s) and hit reactions (1.8-3.2s)
* **PWA Capabilities**: Offline-first with service worker and manifest for mobile installation
* **Accessibility Features**: Mute toggle, haptic feedback, aria-live regions
* **Performance Optimized**: Preloaded assets, minimal DOM reflows, requestAnimationFrame

## Overall Architecture

* **Frontend**: Single-page vanilla JavaScript application with ES modules
* **State Management**: Finite state machine (idle → idle-animate → hit → idle)
* **Asset Management**: Preloaded images and audio with fallback formats
* **Audio System**: Web Audio API with `<audio>` fallback for compatibility
* **PWA Structure**: Cache-first for assets, network-first for HTML/JS
* **File Organization**: Modular structure with separate concerns (state, audio, utils, main app)

## Technical Stack

* **Core**: Vanilla JavaScript (ES modules), HTML5, CSS3
* **Audio**: Web Audio API with multi-format support (.mp3/.ogg)
* **Graphics**: DOM-based image swapping (no canvas required)
* **PWA**: Service Worker + Web App Manifest
* **Performance**: requestAnimationFrame, asset preloading, minimal dependencies

2025-08-22 22:07:36 - Initial Memory Bank setup with Slapocero project context from projectBrief.md