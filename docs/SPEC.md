# 🏀 Hoop Shot Counter — Technical Specification (SPEC)

> **Version:** 1.0 — Phase 1  
> **Last Updated:** 2026-08-24  
> **Status:** Draft

---

## 1. Product Overview

**Hoop Shot Counter** คือเว็บแอปพลิเคชันที่ใช้กล้อง (webcam / กล้องมือถือ) ตรวจจับห่วงบาสเก็ตบอล (rim) และลูกบาสเก็ตบอลแบบ real-time เพื่อนับจำนวนลูกที่ชู้ตลงห่วง พร้อมเล่น Sound Effect ที่ปรับแต่งได้

### 1.1 Goals (Phase 1)
- ✅ ตรวจจับห่วงบาส (rim) ผ่านกล้อง
- ✅ ตรวจจับลูกบาสที่ผ่านห่วง (score detection)
- ✅ เล่น Sound Effect เมื่อชู้ตลง
- ✅ นับและแสดงจำนวนลูกที่ลงสะสม
- ✅ ปรับแต่ง Sound Effect ได้ (เลือกเสียง / อัปโหลดเสียง)

### 1.2 Non-Goals (Phase 1)
- ❌ ตรวจจับสนามบาส (court detection)
- ❌ ตรวจจับผู้เล่น (player tracking)
- ❌ วิเคราะห์ท่าชู้ต (shooting form analysis)
- ❌ บันทึกวิดีโอ
- ❌ ระบบ Login / User account

---

## 2. Technical Architecture

### 2.1 Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Frontend | HTML5 + Vanilla JavaScript + CSS | - |
| Dev Server | Vite | ^5.x |
| Object Detection | Roboflow `inferencejs` | latest |
| Detection Model | Pre-trained YOLOv8/v11 from Roboflow Universe | - |
| Camera | MediaDevices API | Web Standard |
| Drawing | Canvas 2D API | Web Standard |
| Audio | Web Audio API | Web Standard |

### 2.2 Browser Requirements
- Chrome 80+ (แนะนำ)
- Firefox 78+
- Safari 14+ (iOS/macOS)
- Edge 80+
- ต้องรองรับ `getUserMedia` และ `WebGL`

### 2.3 Dependencies
```json
{
  "dependencies": {
    "inferencejs": "latest"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

---

## 3. Features Specification

### 3.1 Camera System

| Feature | Details |
|---------|---------|
| Permission Request | แสดง UI ขอ permission กล้อง พร้อม error handling |
| Camera Selection | Dropdown เลือกกล้อง (webcam, กล้องหน้า/หลังมือถือ) |
| Resolution | ขอ 1280x720 (fallback to available) |
| Frame Rate | Target 30fps |
| Mirror | ไม่ mirror (เพื่อให้ตรงกับมุมจริง) |

### 3.2 Object Detection

| Feature | Details |
|---------|---------|
| Model | Pre-trained basketball + rim detection จาก Roboflow Universe |
| Inference | รันในเบราว์เซอร์ผ่าน `inferencejs` (no backend required) |
| Classes | `rim`, `basketball` (อย่างน้อย 2 classes) |
| Confidence Threshold | Default 0.5 (ปรับได้ 0.1 - 0.9) |
| Inference Rate | ~10-15 FPS (แยกจาก render rate) |
| Visualization | Bounding boxes: Rim = สีเขียว, Ball = สีส้ม |

#### 3.2.1 Model Strategy (Progressive)

เป้าหมาย: ความแม่นยำ ≥ 80% mAP@50 — มุมกล้องหลัก: **ด้านหน้าห่วง**

```
Phase 1: Pre-trained Model จาก Roboflow Universe
         → เลือก model ที่มี classes: basketball + rim
         → mAP@50 ~80% (เพียงพอสำหรับเริ่มต้น)
         → ใช้ inferencejs รันในเบราว์เซอร์ (ฟรี ไม่เสีย credits)
              ↓
         ทดสอบกับห่วงจริง
              ↓
    ┌── แม่น ≥ 80% → ✅ ใช้ต่อ
    └── แม่น < 80% → Phase 2
              ↓
Phase 2: Fine-tune (ปรับโมเดลเดิม)
         → ถ่ายรูปห่วง+ลูกบาสจากมุมกล้องจริง 100-300 รูป
         → Upload ไป Roboflow → annotate bounding boxes
         → Train โดยใช้ pre-trained weights เป็น checkpoint (base)
         → ผลลัพธ์ = ความรู้จาก dataset เดิม 6,000+ รูป + ปรับด้วยรูปเรา
         → เปลี่ยนแค่ model ID ใน config.js (โค้ดไม่ต้องเปลี่ยน)
              ↓
Phase 3: Full Retrain (กรณีสุดท้าย — ไม่คาดว่าจะต้องใช้)
         → สร้าง dataset ใหม่ 500-2000+ รูป
         → ต้องมี GPU สำหรับ training
```

> **หมายเหตุ:** Fine-tune ≠ เทรนใหม่ทั้งหมด — Fine-tune ใช้ weights ของ model เก่าเป็น base แล้วปรับ weights ด้วยรูปใหม่ ทำให้ต้องการรูปน้อย (100-300) และเทรนเร็ว (30-60 นาที)

> **การเปลี่ยน model:** เปลี่ยนแค่ `modelId` ใน `src/config.js` — โค้ดทั้งหมดออกแบบให้ model-agnostic ผ่าน `inferencejs`

### 3.3 Shot Detection Algorithm

**State Machine:**

```
IDLE → TRACKING → BALL_ABOVE → SCORED → COOLDOWN → IDLE
```

**States:**

| State | Condition | Action |
|-------|-----------|--------|
| `IDLE` | ไม่มี ball ใกล้ rim | รอตรวจจับ |
| `TRACKING` | Ball detected ใกล้ rim (within 2x rim width) | ติดตาม ball position |
| `BALL_ABOVE` | Ball centroid อยู่เหนือ rim center Y | บันทึก entry position |
| `SCORED` | Ball centroid ลงต่ำกว่า rim center Y + อยู่ในแกน X ของ rim | 🎯 นับคะแนน + เล่นเสียง |
| `COOLDOWN` | หลังจาก SCORED 2 วินาที | ป้องกันนับซ้ำ |

**Score Conditions:**
1. Ball centroid ต้องเคยอยู่เหนือ rim center Y
2. Ball centroid ต้องเคลื่อนลงต่ำกว่า rim center Y
3. Ball centroid X ต้องอยู่ภายในขอบ rim (± rim width / 2)
4. Downward trajectory (ball Y เพิ่มขึ้นอย่างต่อเนื่อง)

### 3.4 Sound System

| Feature | Details |
|---------|---------|
| Built-in Sounds | swoosh, buzzer, crowd cheer (3 เสียง) |
| Custom Upload | รองรับ .mp3, .wav, .ogg |
| Volume Control | Slider 0-100% |
| Playback Engine | Web Audio API (low-latency) |
| Pre-loading | โหลดเสียงทั้งหมดเมื่อเริ่มแอป |
| Auto-resume | Resume AudioContext หลัง user interaction |

### 3.5 Score Display

| Feature | Details |
|---------|---------|
| Counter | ตัวเลขขนาดใหญ่ แสดงมุมบนขวา |
| Animation | Pulse + glow effect เมื่อคะแนนเพิ่ม |
| Reset | ปุ่ม reset คะแนน |
| Session Stats | จำนวนลูกทั้งหมด ของ session นี้ |

---

## 4. UI/UX Design

### 4.1 Layout

```
┌─────────────────────────────────────────┐
│  [🏀 Hoop Counter]    [Score: 12] [⚙️]  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │         Camera Feed             │    │
│  │     + Canvas Overlay            │    │
│  │    (Bounding Boxes)             │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [📷 Camera: Webcam ▼]  [🔄 Reset]     │
│                                         │
└─────────────────────────────────────────┘
```

### 4.2 Settings Panel (Slide-in)

```
┌──────────────────────┐
│  ⚙️ Settings         │
│                      │
│  🔊 Sound Effect:    │
│  ○ Swoosh            │
│  ○ Buzzer            │
│  ○ Crowd Cheer       │
│  ○ Custom Upload     │
│                      │
│  🔉 Volume: ████░ 80%│
│                      │
│  🎯 Sensitivity:     │
│  ░░░████░░ Medium    │
│                      │
│  📷 Camera:          │
│  [Webcam ▼]          │
│                      │
│  [Close]             │
└──────────────────────┘
```

### 4.3 Visual Design
- **Theme:** Dark mode เป็นหลัก
- **Colors:** Orange (#FF6B35) + Dark (#1A1A2E) basketball theme
- **Typography:** Inter / Outfit จาก Google Fonts
- **Effects:** Glassmorphism panel, glow score counter, pulse animation

---

## 5. Configuration

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

---

## 6. Error Handling

| Scenario | Behavior |
|----------|----------|
| Camera denied | แสดงข้อความ + คำแนะนำเปิด permission |
| Camera not available | แสดง fallback UI |
| Model load failed | แสดง error + retry button |
| Poor lighting | แสดง warning overlay |
| No detections | แสดง "Position camera to see the hoop" |
| Audio blocked | Resume AudioContext on first tap |

---

## 7. Performance Targets

| Metric | Target |
|--------|--------|
| Video render | 30 FPS |
| Inference rate | 10-15 FPS |
| Detection latency | < 100ms per frame |
| Score sound latency | < 50ms from detection |
| Initial load | < 5 seconds (excl. model) |
| Model load | < 10 seconds |
| Memory usage | < 300MB |

---

## 8. Future Phases

### Phase 2
- [ ] จับสนามบาส (court detection)
- [ ] บันทึกวิดีโอพร้อม overlay
- [ ] สถิติ (%, streaks, session history)

### Phase 3
- [ ] ตรวจจับผู้เล่น
- [ ] วิเคราะห์ท่าชู้ต
- [ ] Multiplayer scoring
- [ ] ระบบ Login + cloud storage
