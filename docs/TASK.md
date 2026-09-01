# 📋 Project Task Tracker & Changelog — Hoop Shot Counter

## Overview

Task tracker and release checklist for **Hoop Shot Counter**.

---

## Sprint Checklist

### 📋 1. Project Setup & Infrastructure
- [x] Initialize npm project (`package.json`)
- [x] Configure Vite with `@vitejs/plugin-basic-ssl` and `untun`
- [x] Install dependencies: `inferencejs`, `onnxruntime-web`, `@tensorflow/tfjs`
- [x] Set up project folder structure (`src/`, `styles/`, `sounds/`, `public/`, `scripts/`, `docs/`)
- [x] Configure environment template (`.env.example`)

### 📋 2. Styling & Design System (`styles/index.css`)
- [x] Design tokens: Dark theme (`#0F0F1A`), Basketball Orange (`#FF6B35`), Rim Green (`#00FF88`), Cyan (`#00E5FF`)
- [x] Glassmorphism panels, modals, and settings drawer
- [x] Score badge glow animations (`.scored-anim`)
- [x] Manual Rim drawing banner, dashed box preview, and canvas overlay styles
- [x] Responsive layout for mobile (portrait & landscape) and desktop

### 📋 3. Camera Management (`src/camera.js`)
- [x] WebRTC `getUserMedia` stream initialization with `facingMode: 'environment'`
- [x] Camera device enumeration & switcher
- [x] Fallback constraints and graceful error mapping

### 📋 4. Object Detection Pipeline (`src/detector.js`, `src/onnx-worker-detector.js`, `src/worker/onnx.worker.js`)
- [x] Unified Detector Manager supporting Roboflow and Local ONNX
- [x] Dedicated Web Worker WebGPU/WASM ONNX engine with zero-copy ImageBitmap transfers
- [x] Multi-Model Presets: `roboflow-default`, `local-onnx-swish`, `roboflow-cricket`, `roboflow-devinross`, `roboflow-custom`
- [x] Auto-fallback pipeline to Local ONNX when API Key is missing or network fails
- [x] ⚡ Hoop ROI Turbo Mode Action Zone cropping & coordinate remapping
- [x] Interactive Model Comparison Guide Modal (`💡 แนะนำโมเดล`)

### 📋 5. Shot Tracking (`src/shot-tracker.js`)
- [x] State machine implementation (IDLE → TRACKING → BALL_ABOVE → SCORED → COOLDOWN)
- [x] Anti-Confusion filter between rim and ball
- [x] Stationary Rim Anchor & Cache (EMA smoothing, jump rejection)
- [x] Direct Made Basket trigger for Devin Ross model
- [x] Continuous Downward Raycast Crossing math
- [x] Rebound & upward bounce rejection
- [x] Cooldown timer (2s default) & score counter logic

### 📋 6. Sound System (`src/sound-manager.js`)
- [x] `AudioContext` initialization with `latencyHint: 'interactive'`
- [x] Built-in sound loading: `cha-ching.wav`, `fahhhh.wav`, `green-giant.wav`
- [x] Instant sound playback on score event (< 10ms)
- [x] Custom sound upload & decode (.mp3, .wav, .ogg)
- [x] Volume slider control (GainNode)
- [x] Synthetic fallback sound generator
- [x] AudioContext auto-resume on first user interaction

### 📋 7. UI Controller (`src/ui.js`)
- [x] Dynamic Canvas resolution synchronization with video feed
- [x] 60 FPS Kinematic Projectile Interpolator for smooth ball tracking
- [x] Canvas bounding box drawing with color coding
- [x] Manual Rim ROI drawing (PointerEvents/TouchEvents) & `localStorage` persistence
- [x] Fullscreen mode toggle
- [x] Settings drawer panel, volume slider, confidence slider, camera selector
- [x] Mediator pattern event bindings

### 📋 8. Main App Integration (`src/main.js`)
- [x] True Decoupled 60 FPS render loop (`requestAnimationFrame`)
- [x] Non-blocking asynchronous inference trigger
- [x] Mediator coordination between all modules
- [x] Lifecycle cleanup on `beforeunload`

### 📋 9. Deployment & Mobile Utilities (`scripts/`)
- [x] All-in-One Cloudflare Tunnel runner (`scripts/start-tunnel-cf.js` -> `npm run tunnel:cf`)
- [x] Local LAN IP utility (`scripts/get-ip.js` -> `npm run ip`)
- [x] In-browser hardware benchmark harness (`public/benchmark.html`)

---

## 📈 Changelog

| Date | Change |
|------|--------|
| 2026-09-01 | 🚀 WebGPU Hardware Acceleration: Enabled `onnxruntime-web/all` WebGPU JSEP execution provider in `src/worker/onnx.worker.js`, boosting Local ONNX inference speed to ~30.9ms (10.7x speedup) |
| 2026-09-01 | 🧮 True 60 FPS Kinematic Projectile Extrapolator: Upgraded `src/ui.js` with continuous projectile physics ($g=980\text{ px/s}^2$) gliding smoothly during inference intervals |
| 2026-09-01 | 📐 Continuous Trajectory Raycast Crossing: Upgraded `src/shot-tracker.js` with line-segment intersection math to catch ultra-high-speed swishes without frame tunneling |
| 2026-09-01 | ⚡ Hoop ROI Turbo Mode: Added Action Zone GPU cropping reducing compute pixels by 75% and accelerating heavy models by 3x |
| 2026-09-01 | 🎯 Universal Manual Rim ROI Pinning Mode: Added interactive touch/drag rim pinning on canvas with `localStorage` persistence and single-rim locking filter |
| 2026-09-01 | 🏀 Devin Ross Made Basket SOTA Preset: Added `devin-ross-g0rqc/basketball-ls818/15` preset and direct event trigger |
| 2026-08-31 | Multi-Model & Local ONNX Offline Mode: Added Model Switcher UI in Settings, Local ONNX Detector via `onnxruntime-web`, auto-fallback pipeline, and localStorage memory |
| 2026-08-31 | Sound System Implementation: Added `cha-ching.wav`, `fahhhh.wav`, `green-giant.wav` with Web Audio API |
| 2026-08-31 | Initial Release: Camera module, Roboflow inferencejs detector, 5-state shot tracker, responsive dark UI |
