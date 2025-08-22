# Project Brief — “Slapocero” (working title)

## 1) Vision & Scope
A playful micro web app: a cartoon warthog seen from behind wiggles around while idle; when tapped/clicked on the rear, it reacts with funny faces and surprised expressions. No frameworks; everything built with **vanilla JS**, minimal CSS, and raster assets already prepared. Optionally installable as a **PWA** to play offline on mobile.

## 2) Goals
- **Simplicity**: single page, no external dependencies.
- **Visual consistency**: always the same character/style; preloaded sprites.
- **Responsiveness**: immediate input reaction; low-latency audio.
- **Offline-first**: PWA with cached assets.

## 3) Gameplay Mechanics (States)
Main states (finite state machine):
- **idle** → shows one of the **first 6** images (Prompts 1–6).
- **idle-animate** → at random intervals swaps to another of the **first 6**.
- **hit** → on tap/click, shows one of the **second 6** images (Prompts 7–12) for a random time, then returns to **idle**.

Transitions:
- start → idle
- idle (timer expired) → idle-animate (swap frame) → idle
- idle / idle-animate (user input) → hit → (timer expired) → idle

## 4) Timing & Randomization
- **Idle swap interval**: 3–7 s (uniform).
- **Hit duration**: 1.8–3.2 s (uniform) before returning to idle.
- **Debounce input**: ignore extra taps during *hit* state.

## 5) Assets
### Images (PNG, 3:2, neutral background)
- **Idle set (1–6)**: `slapocero_idle_01..06.png` (Prompts 1–6)
- **Hit set (7–12)**: `slapocero_hit_07..12.png` (Prompts 7–12)

### Audio (multiple formats: `.mp3` + `.ogg` for compatibility)
- **Idle grunts** (soft): `grunt_idle_01..03`  
- **Hit grunts** (more intense): `grunt_hit_01..03`  
- **Slap effect**: `slap_ciaf_01`

> Note: normalize volumes around −14 LUFS; fast onset (<10 ms); slap ≤ 400 ms.

## 6) UX Flow
1. **Load**: optional splash, preload assets; starts with a random idle frame.
2. **Idle**: changes between idle frames every 3–7 s; occasionally plays a soft grunt.
3. **Interaction**: tap/click → enter *hit* state; play `slap_ciaf_01` + random `grunt_hit_*`; display a random frame from 7–12 for 1.8–3.2 s.
4. **Return to Idle**: resumes idle animation and soft grunts.

## 7) Technical Requirements
- **Vanilla JS** ES modules; no mandatory bundler.
- **DOM-based**: use `<img>` swapping; no canvas required.
- **Preload**: `Image()` for sprites, Web Audio API for sound warm-up.
- **Audio**: Web Audio API preferred; `<audio>` fallback.
- **PWA**: `manifest.json` + `service-worker.js` (cache assets). Strategy: *cache-first* for images/audio, *network-first* for html/js.
- **Performance**: minimize reflows; use `requestAnimationFrame` for future transitions.

## 8) Project Structure
```
/ (root)
  index.html
  /assets
    /img
      slapocero_idle_01.png ... slapocero_idle_06.png
      slapocero_hit_07.png  ... slapocero_hit_12.png
    /audio
      grunt_idle_01.{mp3,ogg}
      grunt_idle_02.{mp3,ogg}
      grunt_idle_03.{mp3,ogg}
      grunt_hit_01.{mp3,ogg}
      grunt_hit_02.{mp3,ogg}
      grunt_hit_03.{mp3,ogg}
      slap_ciaf_01.{mp3,ogg}
  /src
    app.js
    audio.js
    state.js
    utils.js
  /pwa
    manifest.json
    service-worker.js
  styles.css
```

## 9) Internal APIs (modules)
### `state.js`
- `State = { IDLE, HIT }`
- `currentState`, `setState(next)`

### `audio.js`
- `loadAudioMap({key:url[]})` → promise
- `play(key, {volume=1, detune=0})`
- `random(keyPrefix)` (e.g. `grunt_idle_*`)

### `app.js`
Handles loop and input.
- `init()` → preload images & audio, bind events, start idle timer
- `showIdleFrame()` → choose 1–6 random (not the same as last)
- `showHitFrame()` → choose 7–12 random
- `scheduleNextIdleSwap()` and `scheduleReturnFromHit()`

### `utils.js`
- `randInt(min, max)`
- `randChoice(array)`
- `once(fn)` / simple debounce.

## 10) PWA
`manifest.json`:
```json
{
  "name": "Slapocero",
  "short_name": "Slapocero",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f3e8d2",
  "theme_color": "#7a4b2a",
  "icons": [
    { "src": "/assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

`service-worker.js` (sketch):
- `install` → cache `index.html`, `styles.css`, `app.js`, sprites, audio, manifest.
- `fetch` → cache-first for `/assets/`, network-first for root/JS.
- `activate` → cleanup old caches.

## 11) Accessibility & Mobile
- Interaction = **tap/click** on the entire image.
- **Aria-live** optional with short cues (“grunt”, “slap”) for screen readers.
- **Mute toggle** (icon) + preference stored in `localStorage`.
- **Haptics** (if available): `navigator.vibrate([10])` on *hit*.

## 12) Optional Telemetry
- Local counters: number of hits, average time between hits, session length. Export JSON manually.

## 13) Acceptance Criteria (MVP)
- [ ] Loads and shows 1 frame from 1–6.
- [ ] If idle, swaps frames every 3–7 s.
- [ ] On tap/click, shows a frame 7–12 for 1.8–3.2 s, then returns to idle.
- [ ] Audio: idle grunts occasionally; hit grunt + `slap_ciaf` on input.
- [ ] Works offline after first load (PWA cache).
- [ ] Mobile + desktop friendly. Mute toggle.

## 14) Expansion Roadmap
- Combo meter / scoring (reaction time, precision).
- Cartoon particles (*stars, sweat drops*).
- Localization of onomatopoeia.
- Settings: idle frequency, volume, haptics.
- *Photo mode* (screenshot current frame).

---
**Note**: asset filenames and timing ranges can be tuned during playtesting for best comedic timing.