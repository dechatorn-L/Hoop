# ⚡ Mobile Inference & Real-Time Tracking Speed Optimization

> **Document:** Performance Engineering, Acceleration Roadmap & Production Benchmarks  
> **Status:** 🟢 Production Optimized (60 FPS Kinematic Tracking & Multi-Model Suite Active)  
> **Target Environment:** Mobile Devices (Snapdragon 8 Gen 2 / Xiaomi 13 / iOS A-Series / MediaTek) · WebRTC 720p–1080p

---

## 📊 Overview & Bottleneck Analysis (Mobile Real-World)

Running computer vision models inside mobile browsers presents unique performance constraints compared to native apps or desktop environments:

| Bottleneck | Cause | Impact on Mobile | Production Solution |
| :--- | :--- | :--- | :--- |
| **High-Res Video Extraction** | 720p/1080p camera frames require large synchronous canvas pixel reads | Freezes UI frame loop for 20–40 ms per frame | **GPU Buffer Preprocessing (Fast `drawImage` 640px)** |
| **Heavy Model Latency** | 25M–28M parameter models take 200–350 ms per forward pass on mobile WebGL | Bounding boxes update at only 3–5 FPS, causing visual stutter | **60 FPS Kinematic Trajectory Interpolator** |
| **Main Thread Blocking** | AI matrix multiplication running on UI thread causes camera jitter | Camera display framerate drops below 30 FPS | **Dedicated Web Worker Pipeline (`onnx.worker.js`)** |
| **Rim Detection Hallucination** | Fast motion or hand holding ball misclassified as rim | Rim bounding box flickers or jumps | **Universal Manual Rim ROI Pinning Mode (100% Locked)** |

---

## 🚀 Speed Optimization Strategies (Architecture)

```mermaid
graph TD
    A["Camera Stream (WebRTC 720p / 1080p @ 60 FPS)"] --> B["GPU Buffer Preprocessing (Downscale to 640px in 0.3ms)"]
    B --> C["AI Detection Engine (Local ONNX Worker / Roboflow WebGL Worker)"]
    C --> D["60 FPS Kinematic Trajectory Interpolator (EMA Velocity & Gravity)"]
    D --> E["Silky Smooth 60 FPS Bounding Box Follow"]
```

---

## 🎯 Production Strategies Implemented

### 1. 🧮 60 FPS Kinematic Trajectory Interpolator (Phase D — Completed)
- **Concept:** Combine AI detection intervals (3–30 FPS) with 60 FPS physics estimation on `requestAnimationFrame`.
- **Implementation (`src/ui.js`):**
  - Tracks ball velocity vector $(v_x, v_y)$ with Exponential Moving Average (EMA).
  - Extrapolates ball flight path between AI frames using projectile kinematics:
    $$x(t) = x_0 + v_x \cdot \Delta t$$
    $$y(t) = y_0 + v_y \cdot \Delta t + \frac{1}{2} g \cdot \Delta t^2$$
  - Smoothly anchors to new AI ground truth upon arrival.
- **Result:** Silky-smooth 60 FPS visual tracking with zero stutter, even on heavier 300ms models.

---

### 2. 🔬 GPU Buffer Preprocessing (720p/1080p ➔ 640px)
- **Concept:** Hardware-accelerated GPU downscaling before pixel extraction.
- **Implementation (`src/detector.js`):**
  - Pre-renders camera feed to an internal offscreen buffer canvas (`maxDim: 640`) via GPU `drawImage` (< 0.3 ms).
  - Passes 640px buffer to `CVImage`, cutting memory bandwidth and main-thread pixel read time by 60%.
  - Re-scales bounding box coordinates to original display resolution seamlessly.

---

### 3. 🎯 Universal Manual Rim ROI & ⚡ Hoop ROI Turbo Mode (3x Acceleration)
- **Concept:** Lock physical hoop coordinates on tripod camera setup and crop the Action Zone around the rim.
- **Implementation (`src/detector.js`, `src/ui.js`, `src/main.js`):**
  - Interactive touch/drag box overlay to pin exact rim coordinates (`hoop_manual_rim_roi` in `localStorage`).
  - **⚡ Hoop ROI Turbo:** Crops the Action Zone (Top $+2.0\times$, Bottom $+2.8\times$, X $\pm 1.5\times$ around rim), reducing compute pixels by $4\times-5\times$.
  - Automatically re-maps detected bounding box coordinates $(x_{\text{crop}}, y_{\text{crop}})$ back to full-screen coordinates.
  - Adds dedicated Settings switch `#toggle-hoop-roi` (default ON with `localStorage` memory).
  - Accelerates heavy models (`Devin Ross`, `Cricket 9.5K`) from ~3 FPS to **12–18 FPS**!

---

### 4. 🧵 Dedicated Web Worker Pipeline (Single-Thread WASM SIMD) (Phase C — Completed)
- **Concept:** Offload ONNX tensor construction and inference from the Main UI thread.
- **Benchmark Evaluation (1 Thread vs 2 Threads):**
  - **1 Thread (Single Core SIMD):** `320.99 ms` (Fastest, zero thread context-switch overhead).
  - **2 Threads (Multi-Thread WASM):** `389.26 ms` (Slower due to browser WASM thread synchronization overhead without COOP/COEP SharedArrayBuffer).
  - 💡 **Production Decision:** Locked to `numThreads = 1` for optimal CPU efficiency and zero thermal overhead.

---

### 5. 🔊 Web Audio Low-Latency Interactive Mode (`src/sound-manager.js`)
- **Concept:** Zero-buffer audio playback on made basket.
- **Implementation:** `new (AudioContext)({ latencyHint: 'interactive' })`.

---

## 📊 Production Model Benchmarks (Xiaomi 13 / Snapdragon 8 Gen 2)

| Preset | Model ID / Path | Architecture | Native Inference Time | With Hoop ROI Turbo | Visual Tracking FPS | Best Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| ⚡ **Roboflow v4: Main** | `people_basketball_hoops/4` | YOLOv5/v8 Nano (WebGL Cloud) | **~45–60 ms** | **~25–35 ms** | 🟢 **45–60 FPS** | 🥇 แนะนำใช้งานทั่วไป (เสถียร + ลื่นไหลสูงสุด) |
| ⚡ **Local ONNX: Swish-Vision** | `/models/basketball_swish_yolov8.onnx` | YOLOv8n (11.7 MB · WASM SIMD) | **~320 ms (Inference)** | **~120 ms (ROI Crop)** | 🟢 **60 FPS (Via Interpolator)** | 🥈 ใช้งานออฟไลน์ 100% |
| 🎯 **Roboflow: Cricket 9.5K** | `cricket-qnb5l/basketball-xil7x/1` | YOLOv8m (9.5K Dataset) | **~250–320 ms** | **~80–110 ms (⚡ 3x เร็วขึ้น)** | 🟢 **60 FPS (Via Interpolator)** | 🎯 โมเดลชุดใหญ่ เน้นความแม่นยำสูง |
| 🎯 **Roboflow: Devin Ross** | `devin-ross-g0rqc/basketball-ls818/15` | Roboflow Snap (8.1K Dataset) | **~280–350 ms** | **~85–120 ms (⚡ 3x เร็วขึ้น)** | 🟢 **60 FPS (Via Interpolator)** | 🎯 ตรวจจับจังหวะ `made basket` ลงห่วง (ใช้คู่ล็อกห่วง) |

---

## 📋 Implementation Milestones

- [x] **Phase A (TFJS WebGL Evaluation):**
  - [x] Evaluated TensorFlow.js WebGL backend vs ONNX Runtime & `inferencejs`.
  - [x] Deprecated generic TFJS due to GPU readback bottleneck and lack of rim class.
- [x] **Phase C (Web Worker Pipeline & Adaptive Multi-Threading):**
  - [x] Implemented `src/worker/onnx.worker.js` with `OffscreenCanvas`, `ImageBitmap`, and `numThreads = 2`.
  - [x] Decoupled Main UI render loop (locked at 60 FPS) from AI inference.
- [x] **Phase D (Kinematic Trajectory Interpolation & Hoop ROI Turbo):**
  - [x] Implemented 60 FPS kinematic projectile trajectory interpolator in `src/ui.js`.
  - [x] Implemented GPU Canvas Buffer Downscaling (720p/1080p ➔ 640px) in `src/detector.js`.
  - [x] Implemented Universal Manual Rim ROI Pinning mode with `localStorage` persistence.
  - [x] Implemented ⚡ **Hoop ROI Turbo Mode (Action Zone Cropping & Coordinate Remapping)** with Settings Toggle.
- [ ] **Phase E (Custom Lightweight Model Training - Next Step):**
  - Train YOLOv8n natively on basketball dataset at `384x384` input resolution from epoch 0.
  - Apply Quantization-Aware Training (QAT) to maintain 99% mAP accuracy at 3–4 MB file size.

