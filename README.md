# 🏀 Hoop Shot Counter

<div align="center">

![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![JavaScript](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Roboflow](https://img.shields.io/badge/Roboflow-Inference-8A2BE2?style=for-the-badge&logo=roboflow&logoColor=white)
![Web Audio](https://img.shields.io/badge/Web_Audio_API-00E676?style=for-the-badge&logo=soundcharts&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

**Real-Time Computer Vision Basketball Shot Tracking & Audio Feedback Web Application**

[Live Demo](#quick-start) • [Architecture](docs/ARCHITECTURE.md) • [Documentation Hub](docs/INDEX.md) • [Roadmap](docs/ROADMAP.md)

</div>

---

## 📖 Overview

**Hoop Shot Counter** is a browser-based, client-side computer vision application designed to automatically track basketball shots and count completed baskets in real time using your device's camera (Webcam or Smartphone). 

Powered by **Roboflow Inference.js** and pre-trained YOLO object detection models, the system tracks the ball's trajectory relative to the rim and triggers instant spatial audio feedback (Swish, Buzzer, Crowd Cheer, or Custom Audio) upon a successful s## ✨ Key Features

- 🤖 **Multi-Model Detection Suite**: Choose between **Roboflow Universe (Cloud)** or **Local ONNX Suite (Offline 100%)** directly from the UI.
- ⚡ **Local ONNX & WebGPU Acceleration**: Runs YOLOv8 `Swish-Vision (11.7 MB)` client-side via `onnxruntime-web/all` (WebGPU JSEP) with **~30.9ms latency (10.7x speedup)** and zero cloud latency.
- 🧮 **Decoupled 60 FPS Kinematic Projectile Interpolator**: Decouples UI rendering from AI inference, running camera & bounding boxes at a locked **60.0 FPS** with continuous gravity projectile physics ($g=980\text{ px/s}^2$).
- 🎯 **Universal Manual Rim Pinning & ⚡ Hoop ROI Turbo**: Pin exact rim coordinates on canvas and crop the Action Zone on the GPU, accelerating heavy models (`Cricket 9.5K`, `Devin Ross`) by **3x (80–110ms)**.
- 📐 **Continuous Trajectory Raycast Crossing**: Line-segment intersection math captures high-speed swishes and dunks without frame tunneling or dropped points.
- 🛡️ **Anti-Confusion & Rebound Rejection**: Spatial cylinder validation and upward velocity rejection prevent premature or false scoring.
- 💾 **Smart LocalStorage Persistence**: Remembers custom Model IDs, API keys, selected presets, and manual rim coordinates across sessions.
- 💡 **In-App Model Comparison Guide**: Built-in interactive guide popup explaining accuracy, latency, and best scenarios for each model.
- 🔊 **Low-Latency Dynamic Web Audio**: Audio effects with `latencyHint: 'interactive'` for instant (<10ms) playback on made baskets.
- 📱 **Mobile-First & Stadium UI**: Dark glassmorphism interface with neon score counters, live latency metrics, and front/rear camera switching.
- 🔒 **Zero-Config Mobile HTTPS & Tunneling**: All-in-One Cloudflare Tunnel integration spinning up Vite with public mobile HTTPS access and QR code.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INPUT LAYER                                 │
│                                                                     │
│   📷 Camera Stream ──► HTML5 Video Element                         │
│                              │                                      │
│                              ▼                                      │
│                   Canvas 2D Overlay (Locked 60 FPS)                 │
│                              ▲                                      │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
          ┌────────────────────┴────────────────────┐
          │                                         │
          ▼                                         │
┌─────────────────────────────────────┐             │
│   DETECTION LAYER (Background Async)│             │
│                                     │             │
│   Unified Detector                  │             │
│     ├── GPU WebGL ──► Roboflow      │             │
│     │                  Engine       │             │
│     └── Web Worker ──► ONNX Suite   │             │
│          WebGPU        (30.9ms)     │             │
│                                     │             │
│   (Auto Fallback: Cloud → Local)    │             │
└──────────────┬──────────────────────┘             │
               │                                    │
               ▼                                    │
┌─────────────────────────────────────┐             │
│   TRACKING & KINEMATICS ENGINE      │             │
│                                     │             │
│   Spatial Trajectory Tracker        │             │
│         │                           │             │
│         ▼                           │             │
│   Raycast Rim Crossing?             │             │
│     ├── Yes ──► Score +1 ───────┐   │             │
│     └── No  ──► Kinematic       │   │             │
│                 Extrapolator ───┼───┼─────────────┘
│                 (60 FPS)        │   │    (feeds Canvas)
└─────────────────────────────────┼───┘
                                  │
               ┌──────────────────┘
               ▼
┌─────────────────────────────────────┐
│   AUDIO & HUD                       │
│                                     │
│   🔊 Web Audio (Low Latency <10ms) │
│   🏆 HUD Scoreboard Glow           │
└─────────────────────────────────────┘
```

---

## 📁 Project Structure

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
│   └── generate-sounds.js      # Synthesize fallback audio files
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

## ⚡ Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- A device with a working webcam or smartphone camera
- *(Optional)* [Roboflow API Key](https://roboflow.com/) for custom model training

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/dechatorn-L/Hoop.git
cd Hoop

# 2. Install dependencies
npm install

# 3. Setup environment variables (optional for default key)
cp .env.example .env

# 4. Start local development server (with HTTPS)
npm run dev
```

Open `https://localhost:5173` in your browser. (Accept the self-signed SSL certificate in your browser).

---

## 📱 Testing on Mobile / Outdoor Court

To use your smartphone camera on an actual basketball hoop, you need an HTTPS connection to grant camera permissions:

### Option 1: Zero-Config Cloudflare Tunnel (Recommended)
```bash
npm run tunnel:cf
```
*Generates a public temporary HTTPS URL (e.g. `https://xxxx.trycloudflare.com`) accessible from any mobile browser.*

### Option 2: Local Area Network (Wi-Fi)
```bash
npm run ip
# Then connect to https://<YOUR_LOCAL_IP>:5173 on your mobile phone on the same Wi-Fi
```

---

## 📚 Documentation Suite

| Document | Description |
|---|---|
| [**INDEX.md**](docs/INDEX.md) | Central hub and overview for all project documentation |
| [**ARCHITECTURE.md**](docs/ARCHITECTURE.md) | Deep dive into FSM state transitions, coordinate mapping, and module APIs |
| [**SPEC.md**](docs/SPEC.md) | Formal functional requirements, FPS limits, and detection tolerances |
| [**STYLE_GUIDE.md**](docs/STYLE_GUIDE.md) | UI design system, color tokens (`#FF6B35`), and typography |
| [**ROADMAP.md**](docs/ROADMAP.md) | Strategic feature expansions (Accuracy %, Pose estimation, WebGPU) |
| [**DEPLOYMENT.md**](docs/DEPLOYMENT.md) | HTTPS configuration, local tunnel setup, and mobile troubleshooting |
| [**TASK.md**](docs/TASK.md) | Detailed sprint checklist and verification history |

---

## 🌐 Browser Compatibility

| Browser | Platform | Support | Notes |
|---|---|---|---|
| **Google Chrome** | Desktop / Android | ✅ Recommended | Full WebGL & Web Audio hardware acceleration |
| **Safari** | iOS (14.3+) / macOS | ✅ Supported | Requires HTTPS for `getUserMedia` |
| **Mozilla Firefox** | Desktop / Android | ✅ Supported | Full support |
| **Microsoft Edge** | Desktop | ✅ Supported | Chromium engine |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
