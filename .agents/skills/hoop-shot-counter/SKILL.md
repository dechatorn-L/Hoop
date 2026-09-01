---
name: hoop-shot-counter
description: Build and maintain a basketball shot counter web app that uses camera-based object detection to track shots through the hoop with customizable sound effects.
---

# 🏀 Hoop Shot Counter — Skill Instructions

## Overview

เว็บแอป **Hoop Shot Counter** ใช้กล้อง (webcam/มือถือ) ตรวจจับห่วงบาสเก็ตบอลแบบ real-time ด้วย Roboflow `inferencejs` และ Local ONNX WebGPU Runtime (`onnxruntime-web/all`) เพื่อนับจำนวนลูกที่ชู้ตลงห่วงแบบแม่นยำ พร้อม Sound Effect ที่ปรับแต่งได้

---

## Prerequisites

1. **Node.js** v18+ ติดตั้งอยู่ในเครื่อง
2. **Roboflow Account** (ฟรี) — สำหรับโมเดล Roboflow Universe หรือใช้งาน Local ONNX (ออฟไลน์ 100% ไม่ต้องใช้ API Key)
3. **กล้อง** — webcam หรือ กล้องมือถือ (รองรับสลับกล้องหน้า/หลัง)
4. **HTTPS** — `getUserMedia` ต้องการ HTTPS (รันผ่าน `npm run dev` หรือ `npm run tunnel:cf`)

---

## Project Structure

```text
hoop/
├── index.html                  # Main HTML page & Settings drawer
├── package.json                # Dependencies (inferencejs, onnxruntime-web)
├── vite.config.js              # Vite configuration with HTTPS support
├── public/
│   ├── benchmark.html          # In-Browser Real Hardware Benchmark Harness
│   └── models/
│       └── basketball_swish_yolov8.onnx # Swish-Vision YOLOv8n (11.7 MB · WebGPU / WASM)
├── src/
│   ├── main.js                 # App entry point, mediator & decoupled 60 FPS loop
│   ├── camera.js               # Camera access & device management
│   ├── detector.js             # Unified Object Detector Manager (Roboflow + ONNX)
│   ├── onnx-detector.js        # Main-thread ONNX fallback engine
│   ├── onnx-worker-detector.js # Dedicated Web Worker manager for ONNX
│   ├── shot-tracker.js         # Continuous Raycast Crossing & Anti-Confusion state machine
│   ├── sound-manager.js        # Web Audio API low-latency sound player
│   ├── ui.js                   # UI controller, 60 FPS Kinematics & Manual Rim tool
│   ├── config.js               # MODEL_PRESETS, thresholds & constants
│   └── worker/
│       └── onnx.worker.js      # Background WebGPU/WASM ONNX inference worker
├── styles/
│   └── index.css               # Design system & dark glassmorphism styling
├── sounds/                     # Sound effect assets (.wav)
│   ├── cha-ching.wav           # Cash register sound (Default)
│   ├── fahhhh.wav              # Swoosh/air sound FX
│   └── green-giant.wav         # Crowd celebration sound
└── docs/                       # Complete project documentation suite
```

---

## Setup Instructions

### 1. Initialize Project & Dependencies
```bash
npm install
```

### 2. Configure Settings & Default Presets (`src/config.js`)
```javascript
export const DEFAULT_CONFIG = {
  // Detection Model Settings
  modelType: 'roboflow-default',
  publishableKey: import.meta.env.VITE_ROBOFLOW_API_KEY || '',
  modelId: import.meta.env.VITE_ROBOFLOW_MODEL_ID || 'people_basketball_hoops/4',
  onnxModelPath: '/models/basketball_swish_yolov8.onnx',
  confidenceThreshold: 0.35,
  inferenceRate: 20,

  // Shot tracking
  scoreCooldownMs: 2000,
  rimProximityFactor: 2.0,

  // Sound
  defaultSound: 'cha-ching',
  volume: 0.8,

  // Camera
  preferredResolution: { width: 1280, height: 720 },
  facingMode: 'environment',
};
```

### 3. Run Development Server & Mobile Tunnel
```bash
# Local Dev Server
npm run dev

# All-in-One Cloudflare Tunnel for Mobile Testing
npm run tunnel:cf

# Local LAN IP for Wi-Fi Testing
npm run ip
```

---

## Key Modules

### Camera (`src/camera.js`)
- เรียก `navigator.mediaDevices.getUserMedia()` ขอ video stream
- รองรับเลือกกล้อง (หน้า/หลังบนมือถือ)
- Resolution: 1280x720 (fallback auto)

### Detector (`src/detector.js` & `src/onnx-worker-detector.js`)
- Unified Manager รองรับทั้ง Roboflow (`inferencejs`) และ Local ONNX WebGPU Web Worker
- ปรับ Sensitivity (0.01 - 0.99) และ Throttle Inference Rate
- รองรับ ⚡ **Hoop ROI Turbo Mode** ตัดภาพเฉพาะโซน Action Zone รอบห่วงบาส เร่งความเร็ว 3 เท่า

### Shot Tracker (`src/shot-tracker.js`)
- State Machine: `IDLE → TRACKING → BALL_ABOVE → SCORED → COOLDOWN → IDLE`
- Continuous Trajectory Raycast Crossing: คำนวณจุดตัดระนาบห่วง ป้องกัน Ball Tunneling
- Anti-Confusion Filter: ตัดกล่องห่วงปลอมที่ทับซ้อนกับลูกบาสในมือผู้เล่น
- Stationary Rim Anchor & Cache: กรองการกระโดดของห่วงและ Smooth ตำแหน่ง

### Sound Manager (`src/sound-manager.js`)
- Web Audio API (`AudioContext` with `latencyHint: 'interactive'`)
- Pre-decode ไฟล์เสียง `cha-ching.wav`, `fahhhh.wav`, `green-giant.wav` (< 10ms playback)
- รองรับ Custom Sound Upload และมี Synthetic Sound Fallback

### UI Controller (`src/ui.js`)
- 60 FPS Kinematic Projectile Interpolator ลื่นไหลระดับ Native
- Bounding Box Overlay: Rim (`#00FF88`), Ball (`#FF6B35`), Made Basket (`#00E5FF`), Person (`#4CC9F0`)
- Manual Rim ROI Pinning Tool (ลากกล่องกำหนดตำแหน่งห่วงเอง พร้อมจำลง `localStorage`)
- Score Counter Glow Animation และ Settings Drawer

---

## References
- [Roboflow inferencejs docs](https://inference.roboflow.com/)
- [ONNX Runtime Web WebGPU](https://onnxruntime.ai/docs/tutorials/web/)
- [Web Audio API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
