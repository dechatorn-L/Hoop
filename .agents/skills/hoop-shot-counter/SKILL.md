---
name: hoop-shot-counter
description: Build and maintain a basketball shot counter web app that uses camera-based object detection to track shots through the hoop with customizable sound effects.
---

# 🏀 Hoop Shot Counter — Skill Instructions

## Overview

เว็บแอป **Hoop Shot Counter** ใช้กล้อง (webcam/มือถือ) ตรวจจับห่วงบาสเก็ตบอลแบบ real-time ด้วย Roboflow `inferencejs` แล้วนับจำนวนลูกที่ชู้ตลงห่วง พร้อม Sound Effect ที่ปรับแต่งได้

---

## Prerequisites

1. **Node.js** v18+ ติดตั้งอยู่ในเครื่อง
2. **Roboflow Account** (ฟรี) — ต้องมี Publishable API Key
3. **กล้อง** — webcam หรือ กล้องมือถือ
4. **HTTPS** — `getUserMedia` ต้องการ HTTPS (Vite dev server ใช้ localhost ได้)

---

## Project Structure

```
c:\Projects\hoop\
├── index.html                  # Main HTML page
├── package.json                # Dependencies
├── vite.config.js              # Vite configuration
├── src/
│   ├── main.js                 # App entry point & main loop
│   ├── camera.js               # Camera access & management
│   ├── detector.js             # Roboflow model loading & inference
│   ├── shot-tracker.js         # Shot detection state machine
│   ├── sound-manager.js        # Web Audio API sound system
│   ├── ui.js                   # UI updates & interactions
│   └── config.js               # Default settings & constants
├── styles/
│   └── index.css               # All styles (dark theme, basketball colors)
├── sounds/                     # Built-in sound effects
│   ├── swoosh.mp3
│   ├── buzzer.mp3
│   └── crowd-cheer.mp3
└── docs/
    ├── SPEC.md                 # Technical specification
    ├── ARCHITECTURE.md         # Architecture & algorithm details
    ├── TASK.md                 # Task tracking & progress
    ├── IMPLEMENTATION_PLAN.md  # Implementation plan & key decisions
    └── PROMPT_GUIDE.md         # Prompt guide & verification checklists
```

---

## Setup Instructions

### 1. Initialize Project
```bash
npm init -y
npm install inferencejs
npm install -D vite
```

### 2. Configure Roboflow API Key
สร้างไฟล์ `src/config.js` แล้วใส่ API Key และค่าเริ่มต้น (ตาม SPEC.md Section 5):
```javascript
export const DEFAULT_CONFIG = {
  // Detection
  publishableKey: 'YOUR_PUBLISHABLE_KEY_HERE', // Roboflow Publishable API Key
  modelId: 'basketball-rim-detection/1',       // Roboflow model ID
  confidenceThreshold: 0.5,                    // Min confidence for detection
  inferenceRate: 15,                           // Inference FPS (throttled)

  // Shot tracking
  scoreCooldownMs: 2000,                       // Cooldown between scores (ms)
  rimProximityFactor: 2.0,                     // Factor of rim width for tracking zone
  
  // Sound
  defaultSound: 'swoosh',                     // Default sound effect
  volume: 0.8,                                 // Default volume (0-1)

  // Camera
  preferredResolution: { width: 1280, height: 720 },
  facingMode: 'environment',                   // Back camera on mobile
};
```

### 3. Run Development Server
```bash
npm run dev
```

---

## Key Modules

### Camera (`src/camera.js`)
- เรียก `navigator.mediaDevices.getUserMedia()` ขอ video stream
- รองรับเลือกกล้อง (หน้า/หลังบนมือถือ)
- Resolution: 1280x720 (fallback auto)

### Detector (`src/detector.js`)
- โหลดโมเดลผ่าน `InferenceEngine` จาก `inferencejs`
- รัน inference แบบ throttled ที่ 10-15 FPS (แยกจาก render loop)
- Return: `{ class: 'rim'|'basketball', bbox: {x, y, width, height}, confidence: 0-1 }`

### Shot Tracker (`src/shot-tracker.js`)
- State Machine: `IDLE → TRACKING → BALL_ABOVE → SCORED → COOLDOWN → IDLE`
- Track ball centroid relative to rim position
- Score condition: ball ลงจากบนห่วงผ่านลงล่าง + อยู่ในแกน X ของ rim
- Cooldown 2 วินาทีป้องกันนับซ้ำ

### Sound Manager (`src/sound-manager.js`)
- Pre-load sound effects ด้วย Web Audio API
- เล่นเสียงเมื่อ shot tracker trigger `SCORED`
- รองรับเลือกเสียง built-in + อัปโหลดเสียงเอง
- Volume control

### UI (`src/ui.js`)
- Score counter with glow animation
- Settings panel (slide-in) — sound, volume, sensitivity, camera
- Canvas overlay สำหรับวาด bounding boxes

---

## Development Guidelines

### Code Style
- Vanilla JavaScript (ES Modules)
- ไม่ใช้ framework (React, Vue, etc.)
- ใช้ `class` สำหรับ modules หลัก
- JSDoc comments สำหรับ public methods

### Performance
- แยก inference loop ออกจาก render loop
- ใช้ `requestAnimationFrame` สำหรับ rendering
- Target: inference 10-15 FPS, render 30 FPS
- Debounce UI updates

### Error Handling
- Graceful fallback สำหรับทุก error case
- User-friendly error messages (ไทย + อังกฤษ)
- Console logging สำหรับ debug

---

## References

- [Roboflow inferencejs docs](https://inference.roboflow.com/)
- [Roboflow Universe — Basketball Models](https://universe.roboflow.com/)
- [Web Audio API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MediaDevices.getUserMedia — MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
