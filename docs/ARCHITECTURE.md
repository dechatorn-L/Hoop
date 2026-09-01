# 🏗️ System Architecture & Engineering Design — Hoop Shot Counter

> **Status:** Approved & Active  
> **Pattern:** Mediator Pattern, Decoupled 60 FPS Render Loop, Web Worker WebGPU Inference Pipeline

---

## 1. System Overview & Architecture

Hoop Shot Counter ออกแบบโดยใช้ **Decoupled Architecture** เพื่อแยกการประมวลผล 2 ลูปออกจากกันโดยเด็ดขาด:
1. **Unblocked 60 FPS Render & Kinematics Loop:** รันบน Main UI Thread ผ่าน `requestAnimationFrame` วาดวิดีโอกล้อง Bounding Box และคำนวณการเคลื่อนที่ของลูกบาสด้วยฟิสิกส์ ($g = 980\text{ px/s}^2$)
2. **Asynchronous Background Inference Loop:** รันบน Web Worker อิสระ (`src/worker/onnx.worker.js` ด้วย WebGPU หรือ Roboflow Inference Worker) เพื่อไม่ให้กระทบต่อความลื่นไหลของหน้าจอ

```
                                ┌──────────────────────────────────────────┐
                                │             Camera Stream                │
                                │   (WebRTC getUserMedia 720p / 1080p)     │
                                └────────────────────┬─────────────────────┘
                                                     │
                                                     ▼
                                ┌──────────────────────────────────────────┐
                                │            HTML5 Video Element           │
                                │          (#camera-feed @ 60 FPS)         │
                                └───────┬──────────────────────────┬───────┘
                                        │                          │
           (Locked 60 FPS Render Loop)  │                          │ (Non-Blocking Transfer)
                                        ▼                          ▼
                                ┌───────────────┐          ┌───────────────┐
                                │   Canvas 2D   │          │    Unified    │
                                │    Overlay    │          │   Detector    │
                                └───────▲───────┘          └───────┬───────┘
                                        │                          │
                                        │ (60 FPS Interpolation)   ▼
                                        │                  ┌───────────────┐
                                        │                  │  Web Worker   │
                                        │                  │ WebGPU / WASM │
                                        │                  └───────┬───────┘
                                        │                          │
                                        │                          ▼ raw detections
                                        │                  ┌───────────────┐
                                        │                  │ Spatial Anchor│
                                        │                  │ & Crop Remap  │
                                        │                  └───────┬───────┘
                                        │                          │
                                        │                          ▼
                                        │                  ┌───────────────┐
                                        └──────────────────┤ Shot Tracker  │
                                    continuous ball ray    │(Raycast Cross)│
                                                           └───────┬───────┘
                                                                   │
                                                                   ▼ SCORED event (<10ms)
                                                           ┌───────┴───────┐
                                                           ▼               ▼
                                                    ┌─────────────┐ ┌─────────────┐
                                                    │Sound Manager│ │UI Score Glow│
                                                    │ (Web Audio) │ │ & HUD Stats │
                                                    └─────────────┘ └─────────────┘
```

---

## 2. Module Dependency Graph

```
main.js (Mediator)
  ├── config.js               (MODEL_PRESETS, DEFAULT_CONFIG)
  ├── camera.js               (WebRTC, device switcher)
  ├── detector.js             (Unified manager: Roboflow & ONNX)
  │     └── onnx-worker-detector.js  (spawns: src/worker/onnx.worker.js [WebGPU / WASM])
  ├── onnx-detector.js        (Main-thread fallback engine)
  ├── shot-tracker.js         (Continuous Raycast Crossing & Anti-Confusion)
  ├── sound-manager.js        (Web Audio API low latency sound player)
  └── ui.js                   (60 FPS Kinematic Projectile Interpolator & Manual Rim Tool)
```

---

## 3. Module Specifications & APIs

### 3.1 `main.js` — Application Controller & Mediator
- จัดการวงจรชีวิตของแอปพลิเคชัน (Initialization, Event Wiring)
- รัน `mainLoop()` ผ่าน `requestAnimationFrame` โดยไม่บล็อก UI
- ประสานข้อมูลระหว่าง `detector.detect()`, `ui.drawDetections()`, `tracker.update()`, และ `sound.playScoreSound()`

### 3.2 `camera.js` — Camera Manager
```javascript
class CameraManager {
  async start(deviceId = null)       // เริ่มสตรีมกล้อง (default: environment)
  stop()                             // หยุดสตรีมและปล่อยทรัพยากร
  async listDevices()                // คืนค่ารายการกล้องทั้งหมด
  async switchCamera(deviceId)       // สลับไปยังกล้องที่เลือก
  getVideoElement()                  // ได้รับ reference ของ <video>
  onError(callback)                  // สมัครรับแจ้งเตือน error
  onReady(callback)                  // สมัครรับแจ้งเตือนเมื่อกล้องพร้อม
}
```

### 3.3 `detector.js` — Unified Object Detector
```javascript
class ObjectDetector {
  async loadModel(options, apiKey, autoFallback) // โหลดโมเดล Roboflow หรือ Local ONNX
  async detect(videoElement, cropRoi = null)      // ประมวลผลภาพ (รองรับ Hoop ROI Turbo)
  setConfidence(threshold)                        // ปรับ Sensitivity (0.01 - 0.99)
  setInferenceRate(fps)                           // ปรับ Max inference rate
  isReady()                                       // ตรวจสอบสถานะความพร้อม
}
```

### 3.4 `shot-tracker.js` — Continuous Trajectory & Scoring Engine
```javascript
class ShotTracker {
  update(rimOrDetections, ballDetection, madeBasketDetection) // อัปเดตพิกัดและคืนค่า true เมื่อลูกลง
  reset()                                                      // รีเซ็ตคะแนนและสถานะ
  getState()                                                   // คืนค่าสถานะปัจจุบัน (IDLE, BALL_ABOVE, ฯลฯ)
  getScore()                                                   // คืนค่าคะแนนสะสม
  setCooldown(ms)                                              // ปรับระยะเวลา Cooldown
}
```

### 3.5 `sound-manager.js` — Web Audio Engine
```javascript
class SoundManager {
  async init()                         // สร้าง AudioContext (interactive latency)
  async loadBuiltinSounds()            // Preload cha-ching.wav, fahhhh.wav, green-giant.wav
  async loadCustomSound(file)          // อัปโหลดและ decode ไฟล์เสียง (.mp3, .wav, .ogg)
  playScoreSound()                     // เล่นเสียงคะแนนทันที (< 10ms)
  setActiveSound(soundId)              // เลือกเสียงที่ใช้งาน
  setVolume(level)                     // ปรับระดับเสียง (0.0 - 1.0)
  getAvailableSounds()                 // รายชื่อเสียงทั้งหมด
}
```

### 3.6 `ui.js` — UI Controller & Canvas Overlay
```javascript
class UIController {
  initCanvas(videoElement)             // ซิงค์ resolution ภายในของ Canvas ให้เท่ากับ Video
  drawDetections(detections)           // วาด Bounding Box พร้อม 60 FPS Kinematics Interpolator
  incrementScore()                     // เพิ่มคะแนนและแสดง Animation Pulse Glow
  resetScore()                         // รีเซ็ตคะแนนเป็น 0
  startDrawingRim() / stopDrawingRim() // เปิด/ปิด โหมดลากสี่เหลี่ยมล็อกห่วงบาส (Manual ROI)
  setManualRimRoi(roi)                 // บันทึกตำแหน่งห่วงลง localStorage
  clearManualRimRoi()                  // ล้างตำแหน่งห่วงและกลับเป็น Auto Mode
  showSettings() / hideSettings()      // ควบคุม Settings Drawer
  showModelGuide() / hideModelGuide()  // ควบคุม Model Guide Modal
}
```

---

## 4. Canvas Overlay Strategy & Visual Tokens

- **Video-Canvas Co-location**: ซ้อน Canvas 2D ทับ Video ด้วย `position: absolute` และขนาด 100%
- **Resolution Synchronization**: อัปเดต `canvas.width = video.videoWidth` และ `canvas.height = video.videoHeight` อัตโนมัติเมื่อเกิด event `loadedmetadata` หรือ `resize` เพื่อป้องกันกรอบเบี้ยว
- **Color Coding**:
  - 🎯 **Rim (AI Auto / Pinned 📌)**: `#00FF88` (Emerald Green)
  - 🏀 **Basketball**: `#FF6B35` (Basketball Orange)
  - 🎯 **Made Basket (SOTA)**: `#00E5FF` (Electric Cyan)
  - 👤 **Person / Player**: `#4CC9F0` (Sky Blue)
