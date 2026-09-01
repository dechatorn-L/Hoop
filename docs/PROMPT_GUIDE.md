# 🏀 Hoop Shot Counter — Prompt Guide & Verification

> **วิธีใช้:** Copy prompt ทีละหัวข้อ ใส่ chat → รอ agent ทำเสร็จ → ตรวจสอบตาม checklist → ไปต่อ  
> **อัปเดตล่าสุด:** 2026-09-01

---

## 📚 เอกสารโปรเจค (ต้องให้ agent อ่านก่อนเริ่มงาน)

| ไฟล์ | Path | เนื้อหา |
|------|------|---------|
| SKILL.md | `.agents/skills/hoop-shot-counter/SKILL.md` | วิธี setup, module overview, dev guidelines, testing checklist |
| SPEC.md | `docs/SPEC.md` | Feature specs, UI layout, config, performance targets |
| ARCHITECTURE.md | `docs/ARCHITECTURE.md` | Data flow, module APIs, state machine, scoring algorithm |
| IMPLEMENTATION_PLAN.md | `docs/IMPLEMENTATION_PLAN.md` | Tech stack, project structure, key decisions, model strategy |
| TASK.md | `docs/TASK.md` | Task checklist, progress tracking, blockers, changelog |
| OPTIMIZATION_SPEED.md | `docs/OPTIMIZATION_SPEED.md` | Benchmarks, WebGPU JSEP, 60 FPS Kinematics, Hoop ROI Turbo |

---

## สิ่งที่ตัดสินใจแล้ว

| Decision | ค่า |
|----------|-----|
| มุมกล้อง | ด้านหน้าห่วง (front-facing) หรือ มุมข้าง 45 องศา |
| Accuracy target | ≥ 80% mAP@50 |
| Model strategy | Multi-Model Suite (Roboflow Universe + Local ONNX WebGPU `basketball_swish_yolov8.onnx`) |
| Sound effects | `cha-ching.wav`, `fahhhh.wav`, `green-giant.wav` + Custom Upload |
| Mobile Tunnel | All-in-One Cloudflare Quick Tunnel (`npm run tunnel:cf`) |

---

## 📋 1. Verification Checklists

### ✅ Audio System Verification
1. เปิดแอป และเปิด Settings Drawer (⚙️)
2. ทดสอบเลือกเสียง: Cha-Ching 💰, Fahhhh 💨, Green Giant 🎅
3. กดปุ่ม ▶️ ทดสอบเล่นเสียง (Test Sound) → ต้องได้ยินเสียงทันทีโดยไม่มี delay
4. ทดสอบอัปโหลดไฟล์เสียง Custom (.mp3/.wav) → เสียงเล่นถูกต้อง
5. ปรับระดับ Volume Slider (0-100%) → ระดับเสียงเปลี่ยนตามจริง

### ✅ Model Switching Verification
1. เปิด Settings Drawer (⚙️)
2. สลับโมเดลระหว่าง `Roboflow v4: Main`, `Local ONNX: Swish-Vision`, `Roboflow: Cricket 9.5K`, `Roboflow: Devin Ross`
3. กดปุ่ม ⚡ สลับโมเดล (Apply Model) → สลับโมเดลสำเร็จ กล่องตรวจจับและ FPS ทำงานถูกต้อง
4. กดปุ่ม 💡 แนะนำโมเดล → หน้าต่าง Modal คำแนะนำแสดงการเปรียบเทียบทั้ง 5 โมเดลอย่างครบถ้วน

### ✅ Manual Rim Pinning & Hoop ROI Turbo Verification
1. กดปุ่ม 🎯 ล็อกห่วง ที่แถบ Header
2. ใช้นิ้วหรือเมาส์ลากสี่เหลี่ยมคลุมห่วงบาสบนหน้าจอ
3. กล่องห่วงเปลี่ยนเป็นสีเขียว 📌 TARGET RIM (PINNED)
4. เปิด/ปิด โหมด ⚡ Hoop ROI Turbo ใน Settings → การตรวจจับเร็วขึ้นและไม่มีอาการแล็ก
