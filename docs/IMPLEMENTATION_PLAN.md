# 🏀 Basketball Shot Counter — Implementation Plan & Tech Spec

## 1. Overview

Hoop Shot Counter is a client-side computer vision web application designed to automatically track basketball shots and count completed baskets in real time using your device's camera (Webcam or Smartphone).

---

## 2. Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend Core** | HTML5 + Vanilla JavaScript (ES Modules) | Maximum performance, zero framework overhead |
| **Styling** | Vanilla CSS (Dark Stadium Glassmorphism) | Custom tokens, responsive layout, GPU-accelerated animations |
| **AI Inference (Cloud)** | Roboflow `inferencejs` | Fast WebGL in-browser inference for Universe models |
| **AI Inference (Offline)**| ONNX Runtime Web (`onnxruntime-web/all`) | WebGPU JSEP & WASM SIMD execution in dedicated Web Worker |
| **Camera & Video** | MediaDevices API (`getUserMedia`) | Front/rear camera streaming with resolution negotiation |
| **Canvas HUD** | HTML5 Canvas 2D API | 60 FPS Kinematic Projectile Interpolator & bounding boxes |
| **Audio Engine** | Web Audio API (`AudioContext`) | Pre-decoded low-latency (<10ms) playback & custom uploads |
| **Dev & Tunneling** | Vite, `@vitejs/plugin-basic-ssl`, `untun` | Fast dev server, HTTPS on mobile, Cloudflare Tunnel |

---

## 3. Project Structure

```text
hoop/
├── .agents/                    # Agent Customizations & Skills
│   ├── rules/                  # Style & guideline rules
│   └── skills/                 # Custom domain skill (hoop-shot-counter)
│
├── docs/                       # Comprehensive Technical Documentation
│   ├── INDEX.md                # Central Documentation Hub & Navigation
│   ├── ARCHITECTURE.md         # Full System Architecture & Decoupled 60 FPS Loop
│   ├── SPEC.md                 # Technical Specifications & Acceptance Criteria
│   ├── STYLE_GUIDE.md          # UI Design Tokens, Colors & Glassmorphism
│   ├── ROADMAP.md              # Feature Roadmap & Optimization Strategy
│   ├── DEPLOYMENT.md           # Mobile Tunneling & HTTPS Setup Guide
│   ├── TASK.md                 # Task Checklist, Milestones & Changelog
│   ├── IMPLEMENTATION_PLAN.md  # Architectural Decisions & Tech Stack (This file)
│   ├── OPTIMIZATION_SPEED.md   # Empirical Benchmarks & Hardware Audit Report
│   └── PROMPT_GUIDE.md         # AI Prompt Templates & Checklists
│
├── public/                     # Static Assets & Offline Models
│   ├── benchmark.html          # In-Browser Real Hardware Benchmark Harness
│   └── models/
│       └── basketball_swish_yolov8.onnx # Swish-Vision YOLOv8n (11.7 MB · WebGPU / WASM)
│
├── scripts/                    # Development & Tunneling Utilities
│   ├── start-tunnel-cf.js      # All-in-One Cloudflare Tunnel + Auto Dev Runner
│   ├── get-ip.js               # Discover local LAN IP for mobile testing
│   ├── generate-sounds.js      # Synthesize fallback audio files
│   └── download-model.js       # Offline model download helper
│
├── sounds/                     # Sound Effect Assets (.wav)
│   ├── cha-ching.wav           # Cash register sound (Default)
│   ├── fahhhh.wav              # Swoosh/air sound FX
│   └── green-giant.wav         # Crowd celebration sound
│
├── src/                        # Core Application Source Code
│   ├── camera.js               # Camera stream lifecycle & device switcher
│   ├── config.js               # Model presets & default configurations
│   ├── detector.js             # Unified multi-provider detector manager & ROI Cropper
│   ├── onnx-detector.js        # Main-thread ONNX fallback engine
│   ├── onnx-worker-detector.js # Dedicated Web Worker manager for ONNX
│   ├── shot-tracker.js         # Continuous Raycast Crossing shot tracking engine
│   ├── sound-manager.js        # Low-latency Web Audio API sound engine
│   ├── ui.js                   # UI controller, 60 FPS interpolator & manual rim tool
│   ├── main.js                 # Mediator & decoupled 60 FPS loop coordinator
│   └── worker/
│       └── onnx.worker.js      # Background WebGPU/WASM ONNX inference worker
│
├── styles/
│   └── index.css               # Design system & dark glassmorphism styling
├── .env.example                # Environment variables template
├── index.html                  # Main application markup & Settings drawer
├── package.json                # Project dependencies & npm scripts
└── vite.config.js              # Vite configuration & HTTPS plugin
```

---

## 4. Key Architectural Decisions

1. **Decoupled 60 FPS Render Loop**: UI rendering never waits for AI inference. The camera stream and canvas HUD run at a locked 60 FPS, with ball trajectory smoothly interpolated by projectile kinematics.
2. **Dedicated Background Web Worker**: Local ONNX model runs in `src/worker/onnx.worker.js` with WebGPU acceleration (~30.9ms), leaving the Main UI thread completely unblocked.
3. **Continuous Trajectory Raycast Crossing**: Mathematical line-segment intersection detects high-speed swishes through the rim plane without frame tunneling.
4. **Universal Manual Rim Pinning & ⚡ Hoop ROI Turbo**: Allows users to pin exact rim coordinates on screen and crops the Action Zone, cutting memory bandwidth by 75% and accelerating heavy models by 3x.
5. **Interactive Low-Latency Web Audio**: Pre-decodes audio buffers on init for instant (<10ms) sound playback upon scoring.
