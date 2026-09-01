# ⚡ Mobile Inference Speed Optimization Plan

> **Document:** Performance Engineering & Acceleration Roadmap  
> **Status:** 🟡 Active Planning & Staged Rollout  
> **Target:** 60 FPS Real-Time Object Tracking on Mobile Devices (Snapdragon 8 Gen 2 / iOS A-Series / MediaTek)

---

## 📊 Overview & Bottleneck Analysis

Running computer vision models inside mobile browsers presents unique performance constraints compared to native apps or desktop environments:

| Bottleneck | Cause | Impact on Mobile | Solution |
| :--- | :--- | :--- | :--- |
| **GPU Access (WebGPU)** | WebGPU is disabled by default / experimental on mobile Chrome & Safari | Forces fallback to single-threaded CPU WASM (150–250 ms) | Switch to **WebGL** or optimize WASM SIMD |
| **Main Thread Blocking** | `getImageData()` forces synchronous GPU ➔ CPU memory copy | Freezes UI frame loop for 30–60 ms per frame | Use **Web Workers + ImageBitmap** |
| **Input Tensor Size** | 640x640 FP32 requires 8.1 GFLOPs per frame | Excessive compute overhead on mobile battery/CPU | Downscale to **384x384 / 416x416** + **INT8** |
| **Render Stutter** | Bounding box updates only when new inference completes | Visible lag when ball moves fast | **Kalman Filter / 60 FPS Interpolation** |

---

## 🚀 Speed Optimization Strategies

```mermaid
graph TD
    subgraph Strategy 1: Model Compression
        A1["640x640 FP32 (11.7 MB)"] -->|Scale Down| A2["384x384 / 416x416 Input"]
        A2 -->|INT8 Quantization| A3["3.2 MB Lightweight Model (~18ms)"]
    end

    subgraph Strategy 2: WebGL Engine
        B1["Universal Mobile GPU"] -->|WebGL Shaders| B2["TensorFlow.js / WebGL Pipeline"]
        B2 -->|Zero-Config| B3["Native 60 FPS on Android & iOS"]
    end

    subgraph Strategy 3: Web Worker Threading
        C1["Camera Frame (Main Thread)"] -->|ImageBitmap Zero-Copy| C2["Dedicated Web Worker"]
        C2 -->|Offscreen Inference| C3["Unblocked 60 FPS UI Overlay"]
    end

    subgraph Strategy 4: Trajectory Interpolator
        D1["AI Detection (15-20 FPS)"] --> D2["Kalman Filter / Physics Predictor"]
        D2 -->|Interpolate Points| D3["Silky 60 FPS Bounding Box Follow"]
    end
```

---

## 🎯 Detailed Strategy Breakdown

### 1. 🔬 Strategy 1: Input Resolution & Quantization (INT8 / FP16)
- **Concept:** Reduce the spatial dimensions and bit-depth of the neural network weights.
- **Resolution Options:**
  - `640x640` (Current): 409,600 pixels (8.1 GFLOPs) — Ideal for desktop / long distance.
  - `416x416`: 173,056 pixels (3.4 GFLOPs) — **58% compute reduction**.
  - `384x384`: 147,456 pixels (2.9 GFLOPs) — **64% compute reduction**.
- **Quantization (INT8 / FP16):**
  - **FP16:** 0% accuracy loss, cuts memory bandwidth by 50%.
  - **INT8:** ~1-2% mAP loss, cuts model footprint to ~3.2 MB, leverages mobile vector instructions.
- **Accuracy Impact:** At normal basketball court distances (3–6 meters), ball and hoop geometry remain distinct and fully trackable.

---

### 2. ⚡ Strategy 2: TensorFlow.js (WebGL Backend Engine)
- **Concept:** Replace or complement ONNX Runtime with a dedicated WebGL engine.
- **Why WebGL Wins on Mobile:**
  - Supported natively on **100% of Android and iOS devices** without flags or experimental toggles.
  - Compiles neural network layers directly into GPU fragment shaders.
- **Implementation Architecture:**
  - Bundle `tfjs-backend-webgl` with `yolov8n` graph model.
  - Warm up shaders during app startup to eliminate mid-session frame drops.
  - Seamless automatic fallback from WebGPU ➔ WebGL ➔ WASM.

---

### 3. 🧵 Strategy 3: Dedicated Web Worker & OffscreenCanvas
- **Concept:** Move the entire image preprocessing, tensor construction, and model execution off the Main UI Thread.
- **Workflow:**
  1. Capture video frame via `createImageBitmap(videoElement, { resizeWidth: 384, resizeHeight: 384 })` (< 1 ms, zero GPU readback).
  2. Transfer bitmap ownership to Worker via `postMessage([bitmap], [bitmap])`.
  3. Worker executes inference and returns detected `[{ bbox, class, confidence }]`.
  4. Main thread continues rendering the camera stream and canvas HUD at solid 60 FPS.

---

### 4. 🧮 Strategy 4: Kalman Filter & Trajectory Interpolation
- **Concept:** Combine low-frequency AI detections (15–20 FPS) with high-frequency physics estimation (60 FPS).
- **Workflow:**
  - AI provides ground-truth anchors $(x, y, v_x, v_y)$.
  - Between AI detections, a 2D kinematic projectile equation estimates the ball's exact position:
    $$y(t) = y_0 + v_y \cdot \Delta t + \frac{1}{2} g \cdot \Delta t^2$$
  - Result: Perfect fluid motion tracking with zero visual stutter while saving 70% CPU/battery.

---

## 📋 Implementation Milestones

- [ ] **Phase A (Immediate / Experimental):**
  - Test TensorFlow.js WebGL integration alongside Roboflow & ONNX.
  - Benchmark inference latency across mobile chipsets (Snapdragon, Dimensity, Apple Silicon).
- [ ] **Phase B (Model Optimization):**
  - Export Swish-Vision YOLOv8n at 384x384 INT8.
  - Compare detection accuracy and score trigger reliability against 640x640 baseline.
- [ ] **Phase C (Architecture Refactoring):**
  - Implement `worker/detection-worker.js` with `OffscreenCanvas`.
  - Implement 60 FPS bounding box interpolator in `src/ui.js`.
