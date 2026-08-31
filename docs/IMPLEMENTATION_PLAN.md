# 🏀 Basketball Shot Counter — Implementation Plan

## Overview

สร้างเว็บแอปที่ใช้กล้อง (webcam/มือถือ) ตรวจจับ **ห่วงบาสเก็ตบอล (rim)** แบบ real-time แล้วนับจำนวนลูกที่ชู้ตลงห่วง พร้อมเล่น Sound Effect ที่ปรับแต่งได้

### ขอบเขต Phase 1

| Feature | รายละเอียด |
|---------|-----------|
| ตรวจจับห่วง | ใช้กล้องจับตำแหน่งห่วง (rim) ด้วย Object Detection Model |
| ตรวจจับลูกลงห่วง | ติดตามลูกบาสผ่านห่วงด้วย trajectory logic |
| Sound Effects | เล่นเสียงเมื่อชู้ตลง — ปรับแต่งเลือกเสียงได้ |
| นับคะแนน | แสดงจำนวนลูกที่ลงสะสม |

---

## Technology Stack

| Layer | Technology | เหตุผล |
|-------|-----------|--------|
| **Frontend** | HTML5 + Vanilla JS + CSS | ไม่ใช้ framework ตามข้อกำหนด |
| **Object Detection** | Roboflow `inferencejs` | รัน YOLO model ในเบราว์เซอร์, ไม่ต้อง backend |
| **Detection Model** | Pre-trained from Roboflow Universe | โมเดล basketball + rim detection (YOLOv8/v11) |
| **Camera** | MediaDevices API (`getUserMedia`) | เข้าถึงกล้อง webcam/มือถือ |
| **Canvas** | HTML5 Canvas API | วาด bounding box overlay บน video |
| **Audio** | Web Audio API | เล่น sound effects แบบ low-latency |
| **Dev Server** | Vite | Hot reload, serve static files |

---

## Architecture

```
Camera → Video Element → Inference Engine (Roboflow) → Detection Processor
                ↓                                              ↓
         Canvas Overlay                               Shot Tracker (State Machine)
        (Bounding Boxes)                                       ↓
                                                    ┌──────────┴──────────┐
                                                    ↓                     ↓
                                              Sound Manager          UI Score Update
                                             (Web Audio API)
```

---

## Project Structure

```
c:\Projects\hoop\
├── index.html              # Main HTML page
├── package.json            # Dependencies (vite, inferencejs)
├── vite.config.js          # Vite configuration
├── src/
│   ├── main.js             # App entry point & main loop
│   ├── camera.js           # Camera access & management
│   ├── detector.js         # Roboflow model loading & inference
│   ├── shot-tracker.js     # Shot detection state machine
│   ├── sound-manager.js    # Web Audio API sound system
│   ├── ui.js               # UI updates & interactions
│   └── config.js           # Default settings & constants
├── styles/
│   └── index.css           # All styles (dark theme, basketball colors)
├── sounds/                 # Built-in sound effects
│   ├── swoosh.mp3
│   ├── buzzer.mp3
│   └── crowd-cheer.mp3
└── docs/
    ├── SPEC.md                 # Technical specification
    ├── SKILL.md                # Skill instructions
    ├── ARCHITECTURE.md         # Architecture & algorithm details
    ├── TASK.md                 # Task tracking & progress
    ├── IMPLEMENTATION_PLAN.md  # This file
    └── PROMPT_GUIDE.md         # Prompt guide & verification checklists
```

---

## Shot Detection Algorithm

**State Machine:** `IDLE → TRACKING → BALL_ABOVE → SCORED → COOLDOWN → IDLE`

1. ตรวจจับตำแหน่ง **rim** (bounding box center Y)
2. ตรวจจับตำแหน่ง **ball** (bounding box center Y)
3. เมื่อ ball อยู่เหนือ rim → เข้าสถานะ `BALL_ABOVE`
4. เมื่อ ball เคลื่อนลงต่ำกว่า rim center + อยู่ภายในแกน X ของ rim → **SCORED!**
5. Cooldown 2 วินาทีเพื่อป้องกันนับซ้ำ

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Detection approach | Rim + Ball detection | แม่นยำกว่า motion detection |
| Model hosting | Client-side (inferencejs) | ไม่ต้อง backend, privacy-friendly, ฟรีไม่เสีย credits |
| Model strategy | Pre-trained → Fine-tune (progressive) | เริ่ม pre-trained ก่อน, fine-tune ถ้า accuracy < 80% |
| Camera angle | ด้านหน้าห่วง (front-facing) | เป็นมุมที่ pre-trained models รองรับดีที่สุด |
| Accuracy target | ≥ 80% mAP@50 | เพียงพอสำหรับ Phase 1 |
| Sound engine | Web Audio API | Low-latency, volume control |
| Styling | Vanilla CSS | ตามข้อกำหนด |
| Build tool | Vite | Fast dev server, ESM support |

---

## Prerequisites & Blockers

> **🔴 ต้องมี Roboflow API Key** — สร้างบัญชี Roboflow (ฟรี) เพื่อได้ Publishable API Key

> **🟡 เลือก Detection Model** — ต้องเลือก pre-trained model จาก Roboflow Universe ที่ detect ทั้ง rim และ basketball

### Model Strategy (ตัดสินใจแล้ว)

1. **เริ่มต้น:** ใช้ Pre-trained Model จาก Roboflow Universe (classes: `basketball` + `rim`, mAP ~80%)
2. **ถ้า accuracy < 80%:** Fine-tune ด้วยรูปจากมุมกล้องจริง 100-300 รูป
   - Fine-tune = ใช้ weights ของ model เก่าเป็น base (checkpoint) แล้วปรับด้วยรูปใหม่
   - ผลลัพธ์ = ความรู้จาก dataset เดิม + ปรับให้ตรงกับ setup ของเรา
   - เปลี่ยนแค่ `modelId` ใน `config.js` — โค้ดไม่ต้องเปลี่ยน
3. **มุมกล้องหลัก:** ด้านหน้าห่วง (front-facing)
4. **`inferencejs` รันใน browser → ฟรีไม่เสีย Roboflow credits**

---

## Verification Plan

1. กล้องเปิดใช้งานได้ + เห็น video feed
2. Model โหลดสำเร็จ (console log)
3. เล็งกล้องที่ห่วง → เห็น bounding box สีเขียว
4. ถือลูกบาสหน้ากล้อง → เห็น bounding box สีส้ม
5. ชู้ตลูกลงห่วง → เสียง swoosh + คะแนนเพิ่ม
6. เปลี่ยนเสียง → เสียงเปลี่ยนตาม
7. ทดสอบบนมือถือ → layout responsive
