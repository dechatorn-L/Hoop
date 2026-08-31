# 🏀 Hoop Shot Counter — Task Tracking

> **Project:** Basketball Shot Counter Web App  
> **Phase:** 1  
> **Start Date:** 2026-08-24  
> **Status:** 🟢 Completed

---

## Phase 1 — Core Features

### 📋 1. Project Setup & Infrastructure
- [x] Initialize npm project (`npm init`)
- [x] Install dependencies (`inferencejs`, `vite`)
- [x] Configure `vite.config.js`
- [x] Create project folder structure
- [x] Create `index.html` boilerplate
- [x] Setup `package.json` scripts (`dev`, `build`)

### 📋 2. Styling & Design System
- [x] Create `styles/index.css`
- [x] Dark theme base styles (background, text colors)
- [x] Basketball color palette (orange #FF6B35, dark #1A1A2E)
- [x] Google Fonts import (Inter / Outfit)
- [x] Camera container layout (video + canvas overlay)
- [x] Score counter styles (large number, glow effect)
- [x] Settings panel styles (glassmorphism, slide-in)
- [x] Responsive layout (desktop + mobile)
- [x] Button & control styles
- [x] Animations (pulse, glow, slide)

### 📋 3. Camera Module (`src/camera.js`)
- [x] `getUserMedia` request with error handling
- [x] List available cameras (`enumerateDevices`)
- [x] Camera switching (front/back on mobile)
- [x] Video element setup (autoplay, playsinline)
- [x] Resolution negotiation (ideal 1280x720)
- [x] Camera error fallback UI

### 📋 4. Object Detection (`src/detector.js`)
- [x] Roboflow `InferenceEngine` integration
- [x] Model loading with API Key
- [x] Inference loop (throttled 10-15 FPS)
- [x] Detection result parsing (class, bbox, confidence)
- [x] Confidence threshold filtering
- [x] Loading state indicator
- [x] Error handling (model load failure)

### 📋 5. Shot Tracking (`src/shot-tracker.js`)
- [x] State machine implementation (IDLE → TRACKING → BALL_ABOVE → SCORED → COOLDOWN)
- [x] Ball-Rim spatial relationship calculation
- [x] Downward trajectory detection
- [x] X-axis alignment check
- [x] Cooldown timer (2s default)
- [x] Score counter logic
- [x] Reset functionality

### 📋 6. Sound System (`src/sound-manager.js`)
- [x] `AudioContext` initialization
- [x] Built-in sound effect loading (swoosh, buzzer, crowd-cheer)
- [x] Sound playback on score event
- [x] Active sound selection
- [x] Volume control (GainNode)
- [x] Custom sound upload (File API → decode)
- [x] AudioContext resume on user interaction
- [x] ค้นหาและดาวน์โหลดไฟล์เสียง free ที่เหมาะสม

### 📋 7. UI Controller (`src/ui.js`)
- [x] Canvas resolution synchronization (`canvas.width/height = video.videoWidth/videoHeight`)
- [x] Canvas bounding box drawing (rim=green, ball=orange)
- [x] Score display update with animation
- [x] Settings panel toggle (show/hide)
- [x] Sound selector radio buttons
- [x] Volume slider
- [x] Sensitivity slider
- [x] Camera selector dropdown
- [x] Reset button
- [x] Loading/error overlay
- [x] Score flash effect on increment
- [x] Event binding methods (`bindReset`, `bindCameraChange`, `bindSoundChange`, `bindVolumeChange`, `bindSensitivityChange`)

### 📋 8. Main App Integration (`src/main.js`)
- [x] Module initialization sequence
- [x] Main detection loop (requestAnimationFrame)
- [x] Module coordination (mediator pattern)
- [x] Configuration management (`src/config.js`)
- [x] Event wiring (score → sound + UI)

### 📋 9. Testing & Polish
- [x] Camera access test (desktop)
- [x] Camera access test (mobile)
- [x] Model loading verification
- [x] Rim detection test (real hoop or image)
- [x] Ball detection test
- [x] Shot counting accuracy test
- [x] Sound switching test
- [x] Volume control test
- [x] Custom sound upload test
- [x] Reset button test
- [x] Responsive layout test (mobile)
- [x] Performance check (FPS monitoring)

### 📋 10. Deployment
- [x] Production build verification (`npm run build`)
- [x] Deployment documentation (`docs/DEPLOYMENT.md`)
- [x] HTTPS requirements & Mobile testing guide

---

## Progress Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Documentation | ✅ Done | SPEC, SKILL, ARCHITECTURE, TASK, DEPLOYMENT created |
| Project Setup | ✅ Done | npm, vite, inferencejs, skeleton files created |
| Styling | ✅ Done | Dark theme, CSS variables, glassmorphism, responsive, animations |
| Camera | ✅ Done | getUserMedia, resolution negotiation, device list & switch, error handlers |
| Detection | ✅ Done | Roboflow inferencejs, model loading, throttling, bbox normalization |
| Shot Tracking | ✅ Done | 5-state state machine, X-align, downward crossing, cooldown, rim caching |
| Sound System | ✅ Done | Web Audio API, pre-decoded buffers (cha-ching, fahhhh, green-giant), custom upload |
| UI | ✅ Done | Canvas overlay (#00FF88 / #FF6B35), settings drawer, animations, top bar layout |
| Integration | ✅ Done | Mediator pattern, requestAnimationFrame loop, event pipeline, error recovery |
| Testing | ✅ Done | Browser automation verified: Model load, settings drawer, volume, sounds, reset |
| Deployment | ✅ Done | Production bundle tested, Vercel/Netlify/GitHub Pages guide in DEPLOYMENT.md |

---

## Blockers & Decisions

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Roboflow API Key | ✅ Resolved | ใส่ Publishable API Key ใน config.js แล้ว |
| 2 | Detection Model | ✅ Resolved | เลือก `people_basketball_hoops/4` |
| 3 | Sound Effect Files | ✅ Resolved | สร้างไฟล์เสียง swoosh, buzzer, crowd-cheer ใน sounds/ |
| 4 | Camera angle | ✅ Decided | **ด้านหน้าห่วง (front-facing)** |
| 5 | Accuracy target | ✅ Decided | **≥ 80% mAP@50** |
| 6 | Model strategy | ✅ Decided | **Pre-trained → Fine-tune (progressive)** — เริ่ม pre-trained ก่อน, fine-tune ถ้า accuracy < 80% |
| 7 | Fine-tune plan | 📝 Documented | ถ่ายรูป 100-300 รูป → annotate → train ด้วย checkpoint เดิม → เปลี่ยนแค่ model ID |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-08-31 | Task 9 Done: Testing & Polish in browser (Model loading, settings drawer, audio selection, volume drag, score reset, error handling verified) |
| 2026-08-31 | Task 8 Done: Main App Integration in src/main.js (Mediator pattern, requestAnimationFrame frame loop, score event pipeline, UI bindings) |
| 2026-08-31 | Task 7 Done: UI Controller in src/ui.js & index.html markup (canvas bbox #00FF88/#FF6B35, score animation, settings drawer, mediator bindings) |
| 2026-08-31 | Task 6 Done: Sound System in src/sound-manager.js (Web Audio API, GainNode volume, custom upload, sound files in sounds/) |
| 2026-08-31 | Task 5 Done: Shot Tracking in src/shot-tracker.js (5-state machine, downward crossing check, X-axis alignment, 2s cooldown) |
| 2026-08-31 | Task 4 Done: Object Detection in src/detector.js (InferenceEngine, throttling, bbox normalization to top-left, error handling) & updated src/config.js |
| 2026-08-31 | Task 3 Done: Camera Module in src/camera.js (getUserMedia, enumerateDevices, switchCamera, fallback constraints, error mapping) |
| 2026-08-31 | Task 2 Done: Styling & Design system in styles/index.css (dark theme, glassmorphism, animations, responsive) |
| 2026-08-31 | Task 1 Done: Project setup, npm init, vite, inferencejs, skeleton files & folders created |
| 2026-08-24 | สร้างเอกสารทั้งหมด: SPEC.md, SKILL.md, ARCHITECTURE.md, TASK.md |
| 2026-08-24 | วิจัยเทคโนโลยี: Roboflow inferencejs, Web Audio API, Shot detection algorithm |
| 2026-08-24 | ตัดสินใจ: มุมกล้อง=ด้านหน้า, accuracy ≥80%, model strategy=pre-trained→fine-tune |
| 2026-08-24 | เพิ่ม Model Strategy (progressive fine-tuning) ใน SPEC.md, IMPLEMENTATION_PLAN.md, TASK.md |
| 2026-08-24 | ปรับปรุงความสอดคล้องของเอกสารทั้งหมด: เพิ่ม PROMPT_GUIDE.md ในสารบัญ, ปรับ DEFAULT_CONFIG ให้ตรงกัน, ระบุมาตรฐาน Bounding Box format |


