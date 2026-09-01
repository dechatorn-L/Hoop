# 🏀 Hoop Shot Counter — Technical Specification

> **Status:** Approved & Implemented  
> **Target Platform:** Modern Web Browsers (Desktop & Mobile Chrome, Safari, Edge)  
> **Tech Stack:** Vanilla JavaScript (ES Modules), HTML5, CSS3, Web Audio API, WebRTC, Roboflow `inferencejs`, ONNX Runtime Web (`onnxruntime-web/all`)

---

## 1. Product Overview

### 1.1 Goal
สร้างเว็บแอปพลิเคชันสำหรับตรวจจับห่วงบาสเก็ตบอล (Rim) และนับจำนวนลูกบาสเก็ตบอลที่ชู้ตลงห่วงแบบ Real-Time อัตโนมัติผ่านกล้องเว็บแคมหรือกล้องสมาร์ตโฟน พร้อมเล่นเสียง Sound Effect ทันทีที่ทำแต้มสำเร็จ โดยรองรับทั้งโมเดล Cloud จาก Roboflow Universe และโมเดล Local ONNX ออฟไลน์ 100% ผ่าน WebGPU/WASM

### 1.2 Target Users
- ผู้เล่นบาสเก็ตบอลที่ต้องการซ้อมยิงคนเดียวและนับจำนวนลูกลงอัตโนมัติ
- โค้ชหรือผู้จัดกิจกรรมบาสเก็ตบอลที่ต้องการเครื่องมือนับแต้มอัตโนมัติ
- ผู้ใช้งานทั่วไปที่ต้องการความสนุกในการซ้อมบาสเก็ตบอล

### 1.3 Scope (Phase 1)
- ตรวจจับห่วงบาสเก็ตบอล (Rim) และลูกบาสเก็ตบอล (Basketball) แบบ Real-Time
- โหมดล็อกตำแหน่งห่วงบาสด้วยตนเอง (Manual Rim ROI Pinning Mode) พร้อมโหมดเร่งความเร็ว ⚡ Hoop ROI Turbo
- ระบบ State Machine ตรวจจับการเคลื่อนที่ของลูกบาสผ่านห่วงบาส (Continuous Raycast Crossing & Anti-Confusion)
- แสดงคะแนนสะสม (Score Counter) บนหน้าจอ พร้อม Animation Glow Effect
- ระบบเสียง Sound Effect แบบ Low-Latency ด้วย Web Audio API (เลือกเสียง built-in ได้ 3 เสียง หรืออัปโหลดไฟล์เสียงเอง)
- สลับกล้องหน้า/หลังบนสมาร์ตโฟนได้
- ระบบสลับโมเดล AI ตรวจจับได้ 5 รูปแบบ พร้อมคู่มือแนะนำโมเดลในตัวแอป (Model Guide Modal)
- รองรับการใช้งานแบบ Responsive บนมือถือและคอมพิวเตอร์ผ่าน HTTPS

---

## 2. System Architecture & Component Design

### 2.1 Component Overview

```
┌────────────────────────────────────────────────────────┐
│                   HoopCounterApp                       │
│                      (main.js)                         │
└──────┬──────────┬──────────┬──────────┬──────────┬─────┘
       │          │          │          │          │
┌──────▼──┐ ┌─────▼───┐ ┌────▼────┐ ┌───▼────┐ ┌───▼───┐
│ Camera  │ │Detector │ │ Shot    │ │ Sound  │ │  UI   │
│ Manager │ │ Manager │ │ Tracker │ │Manager │ │ Ctrl  │
│(camera) │ │(detector│ │(shot-   │ │(sound- │ │ (ui)  │
│         │ │  .js)   │ │ tracker)│ │manager)│ │       │
└─────────┘ └─────────┘ └─────────┘ └─────────┘ └───────┘
```

---

## 3. Detailed Functional Specifications

### 3.1 Camera Management (`src/camera.js`)
- **API**: `navigator.mediaDevices.getUserMedia`
- **Resolution**: ขอความละเอียด Ideal 1280x720 (Fallback ตามอุปกรณ์)
- **Facing Mode**: Default `environment` (กล้องหลังบนมือถือ)
- **Device Enumeration**: `navigator.mediaDevices.enumerateDevices` เพื่อสร้างรายชื่อกล้องให้ผู้ใช้สลับได้

### 3.2 Object Detection Pipeline (`src/detector.js` & `src/onnx-worker-detector.js`)
- **Dual-Provider Architecture**:
  1. **Roboflow Provider**: รันโมเดลผ่าน `InferenceEngine` (`inferencejs`) ใน Web Worker
  2. **Local ONNX Provider**: รันโมเดล YOLOv8 ผ่าน `src/worker/onnx.worker.js` ด้วย `onnxruntime-web/all` (WebGPU JSEP / WASM SIMD Single-Worker Core)
- **Auto-Fallback Pipeline**: หาก Roboflow API Key ไม่ถูกต้องหรือเครือข่ายขัดข้อง ระบบจะสลับไปใช้ Local ONNX Model (`basketball_swish_yolov8.onnx`) ออฟไลน์อัตโนมัติ
- **Bounding Box Normalization**: ปรับพิกัดกล่องตรวจจับให้อยู่ในรูป Top-Left `{ x, y, width, height }` ในหน่วยพิกเซลของภาพวิดีโอ
- **Hoop ROI Turbo Cropping**: ตัดภาพเฉพาะโซน Action Zone รอบห่วงบาส (Top $+2.0\times$, Bottom $+2.8\times$, X $\pm 1.5\times$) เพื่อลดภาระคำนวณและเพิ่ม FPS 3 เท่า

### 3.3 Shot Detection State Machine (`src/shot-tracker.js`)

```
IDLE ──(Ball near Rim)──► TRACKING ──(Ball above Rim Plane)──► BALL_ABOVE
  ▲                                                                │
  │                                                      (Down Raycast Crossing)
  │                                                                ▼
  └──────────(2s Cooldown Expired)◄────── COOLDOWN ◄──────────── SCORED
```

**Core Algorithms:**
1. **Anti-Confusion Filter**: คำนวณ IoU และ Containment ระหว่าง Rim และ Ball หากลูกบาสในมือผู้เล่นทับซ้อนกับกล่องห่วงอัตโนมัติ จะตัดกล่องห่วงปลอมออก
2. **Stationary Rim Anchor & Cache**: ห่วงบาสเป็นวัตถุอยู่นิ่ง ล็อกพิกัดด้วย EMA Smoothing และกรองการกระโดดผิดปกติ (>100px) พร้อมจำลองพิกัดเดิม 15 วินาทีหากห่วงถูกบังชั่วคราว
3. **Direct Made Basket Trigger**: ตรวจจับคลาส `made basket` โดยตรง (โมเดล Devin Ross) เมื่อตำแหน่งตรงกับห่วง
4. **Continuous Downward Raycast Crossing**: คำนวณจุดตัดแกนระนาบห่วง ($rimCenterY$) ระหว่างตำแหน่งเฟรมก่อนหน้าและเฟรมปัจจุบัน ป้องกัน Ball Tunneling ในจังหวะยิงเร็ว
5. **Rebound & Bounce Rejection**: หากลูกบาสเด้งขึ้น ($dy < -6$) หรือหลุดออกนอกแกน X จะยกเลิกสถานะกลับสู่ `IDLE` ทันที

### 3.4 Sound System (`src/sound-manager.js`)

| Sound ID | Display Name | File Path / Source |
|---|---|---|
| `cha-ching` (Default) | Cha-Ching (Cash 💰) | `sounds/cha-ching.wav` |
| `fahhhh` | Fahhhh (Sound FX 💨) | `sounds/fahhhh.wav` |
| `green-giant` | Green Giant (Ho Ho Ho 🎅) | `sounds/green-giant.wav` |
| `custom` | Custom Upload 📁 | User File (.mp3, .wav, .ogg) |

- **Audio Engine**: Web Audio API (`AudioContext` with `latencyHint: 'interactive'`)
- **Pre-decoding**: โหลดและ Decode ไฟล์เสียงทั้งหมดตอนเริ่มต้นเพื่อลด Latency เหลือ < 10ms
- **Synthetic Fallback**: สร้างคลื่นเสียงสังเคราะห์ในหน่วยความจำหากไฟล์เสียงโหลดไม่สำเร็จ
- **Auto-Resume**: ปลดล็อก AudioContext อัตโนมัติเมื่อผู้ใช้แตะหน้าจอครั้งแรกตามนโยบายเบราว์เซอร์

---

## 4. UI/UX Specifications (`src/ui.js` & `index.html`)

### 4.1 Visual Bounding Box Colors
- **Rim (AI Auto)**: Green (`#00FF88`)
- **Rim (Pinned 📌)**: Green (`#00FF88`) + ป้าย "TARGET RIM (PINNED)"
- **Basketball**: Orange (`#FF6B35`)
- **Made Basket (SOTA)**: Cyan (`#00E5FF`)
- **Person / Player**: Sky Blue (`#4CC9F0`)

### 4.2 60 FPS Kinematic Projectile Interpolator
- วาดภาพ Bounding Box ของลูกบาสด้วยความเร็ว 60 FPS ต่อเนื่องบน `requestAnimationFrame` แม้โมเดล AI จะประมวลผลที่ 10–30 FPS
- คำนวณเวกเตอร์ความเร็ว $(v_x, v_y)$ และแรงโน้มถ่วง $g = 980\text{ px/s}^2$ ทำให้การเคลื่อนที่ของกล่องลูกบาสลื่นไหลระดับ Native 60 FPS

---

## 5. Configuration & Model Presets (`src/config.js`)

```javascript
export const MODEL_PRESETS = {
  'roboflow-default': {
    id: 'roboflow-default',
    name: 'Roboflow v4: Main (⚡ 30-45 FPS แนะนำ)',
    provider: 'roboflow',
    modelId: 'people_basketball_hoops/4',
    description: 'ตรวจจับห่วง ลูกบาส และคน (โมเดล Cloud ยอดนิยม · ลื่นไหล 30-45 FPS)',
  },
  'local-onnx-swish': {
    id: 'local-onnx-swish',
    name: 'Local ONNX: Swish-Vision (⚡ 60 FPS แนะนำ)',
    provider: 'onnx',
    modelPath: '/models/basketball_swish_yolov8.onnx',
    description: 'รันบน Web Worker อิสระ (11.7 MB) ล็อกเฉพาะลูกบาสและห่วง ไม่กินสเปกมือถือ (ออฟไลน์ 100% · 60 FPS)',
  },
  'roboflow-cricket': {
    id: 'roboflow-cricket',
    name: 'Roboflow: Cricket 9.5K Images (🎯 โมเดลละเอียด)',
    provider: 'roboflow',
    modelId: 'cricket-qnb5l/basketball-xil7x/1',
    description: 'โมเดลชุดใหญ่ 9,500+ รูป (cricket-qnb5l/basketball-xil7x/1 · มีระบบ 60 FPS Interpolator ช่วยประมวลผล)',
  },
  'roboflow-devinross': {
    id: 'roboflow-devinross',
    name: 'Roboflow: Devin Ross (🎯 Made Basket SOTA)',
    provider: 'roboflow',
    modelId: 'devin-ross-g0rqc/basketball-ls818/15',
    description: 'ตรวจจับลูกบาสและจังหวะลูกลงห่วง (Devin Ross 8,150 รูป · เหมาะที่สุดเมื่อใช้ร่วมกับปุ่มล็อกห่วง)',
  },
  'roboflow-custom': {
    id: 'roboflow-custom',
    name: 'Roboflow: Custom Model ID (กำหนดเอง)',
    provider: 'roboflow',
    modelId: '',
    description: 'กรอก Model ID และ API Key จากโปรเจกต์ที่คุณเทรนเองบน Roboflow',
  },
};

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

---

## 6. Performance Benchmarks

| Component | Target Metric | Achieved Metric | Status |
|---|---|---|---|
| UI Render Frame Rate | 60.0 FPS Locked | 60.0 FPS | 🟢 Met |
| Local ONNX (WebGPU) | < 50 ms | 23–31 ms (~30.9ms) | 🟢 Exceeded |
| Local ONNX (WASM SIMD) | < 400 ms | 320–330 ms | 🟢 Met |
| Roboflow Cloud Latency | < 100 ms | 45–65 ms | 🟢 Met |
| Audio Playback Latency | < 20 ms | < 10 ms | 🟢 Exceeded |
| Memory Footprint | < 250 MB | ~140–180 MB | 🟢 Met |
