# 🏀 Hoop Shot Counter — Architecture Document

> **Version:** 1.0  
> **Last Updated:** 2026-08-24

---

## 1. System Architecture

### 1.1 High-Level Data Flow

```
┌──────────┐    getUserMedia     ┌──────────┐    frames     ┌──────────────┐
│  Camera  │ ─────────────────▶  │  Video   │ ──────────▶   │  Inference   │
│  (HW)   │                     │  Element │               │  Engine      │
└──────────┘                     └──────────┘               │ (Roboflow)   │
                                      │                     └──────┬───────┘
                                      │                            │
                                      ▼                            ▼ detections[]
                                ┌──────────┐               ┌──────────────┐
                                │  Canvas  │ ◀───────────── │  Detection   │
                                │  Overlay │  draw boxes    │  Processor   │
                                └──────────┘               └──────┬───────┘
                                                                   │
                                                    rim bbox + ball bbox
                                                                   │
                                                                   ▼
                                                           ┌──────────────┐
                                                           │ Shot Tracker │
                                                           │ State Machine│
                                                           └──────┬───────┘
                                                                   │
                                                            SCORED event
                                                                   │
                                                    ┌──────────────┼──────────────┐
                                                    ▼                             ▼
                                             ┌──────────┐                  ┌──────────┐
                                             │  Sound   │                  │   UI     │
                                             │  Manager │                  │  Score   │
                                             └──────────┘                  └──────────┘
```

### 1.2 Module Dependency Graph

```
main.js
  ├── config.js          (no deps)
  ├── camera.js          (no deps)
  ├── detector.js        (depends on: inferencejs, config)
  ├── shot-tracker.js    (depends on: config)
  ├── sound-manager.js   (depends on: config)
  └── ui.js              (no deps)
```

> **Design Principle:** ทุก module เป็น self-contained class ที่สื่อสารผ่าน `main.js` เท่านั้น (Mediator Pattern) — ไม่มี module ไหน import module อื่นโดยตรง ยกเว้น `config.js`

---

## 2. Module Specifications

### 2.1 `main.js` — Application Controller

**Responsibility:** Initialize ทุก module, จัดการ main loop, ประสาน events ระหว่าง modules

```javascript
// Pseudocode — Main Loop
async function mainLoop() {
  // 1. Get current video frame
  const frame = videoElement;

  // 2. Run detection (throttled to inference rate)
  if (shouldRunInference()) {
    const detections = await detector.detect(frame);
    
    // 3. Draw bounding boxes
    ui.drawDetections(canvas, detections);
    
    // 4. Extract rim & ball positions
    const rim = detections.find(d => d.class === 'rim');
    const ball = detections.find(d => d.class === 'basketball');
    
    // 5. Update shot tracker
    const scored = shotTracker.update(rim, ball);
    
    // 6. Handle score
    if (scored) {
      soundManager.playScoreSound();
      ui.incrementScore();
    }
  }

  requestAnimationFrame(mainLoop);
}
```

### 2.2 `camera.js` — Camera Manager

```javascript
class CameraManager {
  // Public API
  async start(deviceId?)          // เริ่มกล้อง
  async stop()                     // หยุดกล้อง
  async listDevices()              // แสดงรายชื่อกล้อง
  async switchCamera(deviceId)     // สลับกล้อง
  getVideoElement()                // ได้ <video> element
  
  // Events
  onError(callback)                // เมื่อเกิด error
  onReady(callback)                // เมื่อกล้องพร้อม
}
```

**Implementation Notes:**
- ใช้ `navigator.mediaDevices.getUserMedia({ video: constraints })`
- Mobile: ใช้ `facingMode: { ideal: 'environment' }` เป็น default เพื่อให้ fallback กลับมาใช้เว็บแคมบน desktop ได้โดยไม่ error
- Resolution: ขอ ideal 1280x720, fallback ตาม hardware

### 2.3 `detector.js` — Unified Object Detector Manager

```javascript
class ObjectDetector {
  // Public API
  async loadModel(options, apiKey, autoFallback) // โหลดโมเดล (Roboflow หรือ Local ONNX)
  async detect(videoElement)                      // รัน inference ตาม provider ปัจจุบัน
  setConfidence(threshold)                        // ปรับ sensitivity (0.01 - 0.99)
  setInferenceRate(fps)                           // ปรับ max inference FPS (throttled)
  isReady()                                       // ตรวจสอบความพร้อมของ active model
  
  // Return format
  // [{ class: 'rim', bbox: { x, y, width, height }, confidence: 0.94 }, ...]
  // หมายเหตุ: bbox ใช้พิกัด Top-Left (x, y) ในหน่วย pixels ของ video/canvas frame
}
```

**Implementation Notes:**
- ทำหน้าที่เป็น **Unified Facade / Manager** รองรับทั้ง 2 Inference Providers:
  1. **Roboflow Provider:** รันผ่าน `InferenceEngine` (`inferencejs`) ใน Web Worker
  2. **ONNX Provider:** รันผ่าน `OnnxObjectDetector` (`onnxruntime-web`) ด้วย WebGPU/WASM
- **Auto-Fallback Pipeline:** หากโหลดโมเดล Roboflow ล้มเหลว (เช่น API Key หมดอายุ, เครือข่ายหลุด) ตัว Detector จะสลับไปโหลด Local ONNX Model อัตโนมัติ

### 2.3.1 `onnx-detector.js` — Local In-Browser ONNX Engine

```javascript
class OnnxObjectDetector {
  async loadModel(modelPath)         // สร้าง ONNX InferenceSession (WebGPU -> WASM fallback)
  async detect(videoElement)         // Preprocess [1,3,640,640] -> session.run() -> NMS Postprocess
  setConfidence(threshold)
  setInferenceRate(fps)
  isReady()
}
```

- **Preprocessing:** ใช้ Offscreen Canvas วาดภาพขนาด 640x640 แปลงเป็น Normalized Float32Array `[1, 3, 640, 640]` (CHW planar format)
- **Inference Acceleration:** เลือกใช้ `webgpu` เป็นลำดับแรกเพื่อความเร็ว 30–60 FPS และ fallback สู่ `wasm` (SIMD Multi-threaded)
- **Postprocessing & NMS:** ถอดรหัส Tensor Shape `[1, 4 + classes, 8400]` กรองค่า Confidence และคำนวณ Non-Maximum Suppression (IoU 0.45)

### 2.4 `shot-tracker.js` — Shot Detection Engine

```javascript
class ShotTracker {
  // Public API
  update(rimDetection, ballDetection)  // อัปเดตทุกเฟรม, return true ถ้า scored
  reset()                              // reset state
  getState()                           // ได้ state ปัจจุบัน
  getScore()                           // ได้คะแนนปัจจุบัน
  setCooldown(ms)                      // ปรับ cooldown
}
```

**State Machine Detail:**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌──────┐   ball near   ┌──────────┐  ball above  ┌──────────┐ │
│  │ IDLE │ ────────────▶ │ TRACKING │ ───────────▶ │BALL_ABOVE│ │
│  └──┬───┘               └────┬─────┘              └────┬─────┘ │
│     ▲                        │                          │       │
│     │ timeout                │ ball lost                │       │
│     │                        ▼                          │       │
│     │                   ┌──────┐                        │       │
│     ├───────────────── │ IDLE │                        │       │
│     │                   └──────┘                        │       │
│     │                                                   │       │
│     │                              ball crosses below   │       │
│     │                              rim + within X range │       │
│     │                                                   ▼       │
│     │    2s cooldown    ┌──────────┐              ┌──────────┐  │
│     ◀────────────────── │ COOLDOWN │ ◀─────────── │  SCORED  │  │
│                         └──────────┘   play sound └──────────┘  │
│                                        + score++                │
└─────────────────────────────────────────────────────────────────┘
```

**Scoring Algorithm:**

```javascript
// Pseudocode
function checkScore(rim, ball) {
  const rimCenterX = rim.x + rim.width / 2;
  const rimCenterY = rim.y + rim.height / 2;
  const ballCenterX = ball.x + ball.width / 2;
  const ballCenterY = ball.y + ball.height / 2;

  // Check X alignment: ball ต้องอยู่ในแนว rim
  const xAligned = Math.abs(ballCenterX - rimCenterX) < rim.width * 0.6;

  // Check downward crossing: ball เคยอยู่เหนือ rim แล้วลงมาต่ำกว่า
  const crossedDown = previousBallY < rimCenterY && ballCenterY > rimCenterY;

  return xAligned && crossedDown;
}
```

### 2.5 `sound-manager.js` — Audio System

```javascript
class SoundManager {
  // Public API
  async init()                        // สร้าง AudioContext + preload sounds
  async loadBuiltinSounds()           // โหลดเสียง built-in
  async loadCustomSound(file)         // โหลดเสียงจาก File object
  playScoreSound()                    // เล่นเสียง score ปัจจุบัน
  setActiveSound(soundId)             // เลือกเสียง
  setVolume(level)                    // ปรับ volume (0-1)
  getAvailableSounds()                // รายชื่อเสียงทั้งหมด
}
```

**Implementation Notes:**
- ใช้ `AudioContext` เดียวตลอด application lifecycle
- Pre-decode ทุก sound effect เป็น `AudioBuffer` ตอน init
- เล่นผ่าน `AudioBufferSourceNode` → `GainNode` → `destination`
- Resume AudioContext เมื่อ user interaction ครั้งแรก (browser policy)

### 2.6 `ui.js` — UI Controller

```javascript
class UIController {
  // Public API — Rendering & Updates
  initCanvas(videoElement)             // ซิงค์ขนาด canvas (width/height) ตาม videoWidth/videoHeight
  drawDetections(canvas, detections)   // วาด bounding boxes
  incrementScore()                     // เพิ่มคะแนน + animation
  resetScore()                         // reset คะแนน
  showSettings()                       // เปิด settings panel
  hideSettings()                       // ปิด settings panel
  showError(message)                   // แสดง error
  showLoading(message)                 // แสดง loading state
  setStatus(text)                      // อัปเดต status bar

  // Event Binding (Mediator Pattern — ส่ง event ให้ main.js)
  bindReset(handler)                   // เมื่อผู้ใช้กด Reset
  bindCameraChange(handler)            // เมื่อผู้ใช้เลือกกล้องใหม่
  bindSoundChange(handler)             // เมื่อผู้ใช้เปลี่ยนเสียง
  bindVolumeChange(handler)            // เมื่อผู้ใช้ปรับ Volume
  bindSensitivityChange(handler)       // เมื่อผู้ใช้ปรับ Sensitivity (Confidence Threshold)
}
```

---

## 3. Canvas Overlay Strategy

Video และ Canvas ซ้อนกันอย่างถูกต้อง (ป้องกัน Container ยุบตัว):

```html
<div class="camera-container">
  <video id="camera-feed" autoplay playsinline></video>
  <canvas id="detection-overlay"></canvas>
</div>
```

```css
.camera-container {
  position: relative;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
}

#camera-feed {
  display: block;
  width: 100%;
  height: auto;
  object-fit: cover;
}

#detection-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* เพื่อให้คลิกทะลุได้ */
}
```

**Resolution Sync Note:**
- เมื่อ `<video>` โหลด Metadata เสร็จ (`loadedmetadata`) ต้องกำหนดขนาดความละเอียดภายในของ Canvas ให้เท่ากับ Video เสมอ:
  ```javascript
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ```
  เพื่อป้องกันปัญหา Bounding Box เบี้ยว หรือไม่ตรงกับตำแหน่งจริงของลูกบาส/ห่วง

Canvas จะถูก clear + redraw ทุกเฟรมด้วย bounding boxes:
- **Rim:** กรอบสีเขียว (#00FF88) + label "RIM" + confidence %
- **Basketball:** กรอบสีส้ม (#FF6B35) + label "BALL" + confidence %

---

## 4. Event Flow — Score Sequence

```
Frame N:     Ball detected ABOVE rim     → state = BALL_ABOVE
Frame N+k:   Ball crosses BELOW rim Y    → state = SCORED
                                           ├── soundManager.playScoreSound()
                                           ├── ui.incrementScore()
                                           └── state = COOLDOWN
Frame N+k+60: Cooldown expired (2s)      → state = IDLE
```

---

## 5. Performance Considerations

### 5.1 Frame Budget

| Task | Budget |
|------|--------|
| Video render | ~2ms (browser native) |
| Canvas draw | ~1ms |
| Model inference | ~50-80ms (depends on device) |
| Shot tracking logic | < 1ms |
| Sound playback | < 1ms (pre-decoded) |
| **Total per frame** | **~55-85ms** (allows 12-18 inference FPS) |

### 5.2 Optimization Techniques
- **Throttled inference:** ไม่รัน inference ทุกเฟรม — throttle ที่ 10-15 FPS
- **Web Worker:** `inferencejs` รัน model ใน background worker โดยอัตโนมัติ
- **Canvas batching:** วาดทุก bounding box ในรอบเดียว
- **Pre-decoded audio:** Sound effects ถูก decode ตอน init ไม่ใช่ตอนเล่น

---

## 6. Security & Privacy

- ❌ ไม่มีการส่งภาพ/วิดีโอไปยัง server ใดๆ (โมเดลรันในเบราว์เซอร์)
- ❌ ไม่มีการบันทึกวิดีโอ
- ✅ Camera permission ต้องได้รับอนุญาตจากผู้ใช้
- ✅ API Key ของ Roboflow เป็น publishable key (ไม่ใช่ secret key)
- ✅ ทุกอย่างรันใน client-side เท่านั้น
