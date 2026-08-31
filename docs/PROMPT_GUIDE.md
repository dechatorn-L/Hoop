# 🏀 Hoop Shot Counter — Prompt Guide & Verification

> **วิธีใช้:** Copy prompt ทีละหัวข้อ ใส่ chat → รอ agent ทำเสร็จ → ตรวจสอบตาม checklist → ไปต่อ  
> **อัปเดตล่าสุด:** 2026-08-24

---

## 📚 เอกสารโปรเจค (ต้องให้ agent อ่านก่อนเริ่มงาน)

| ไฟล์ | Path | เนื้อหา |
|------|------|---------|
| SKILL.md | `.agents/skills/hoop-shot-counter/SKILL.md` | วิธี setup, module overview, dev guidelines, testing checklist |
| SPEC.md | `docs/SPEC.md` | Feature specs, UI layout, config, performance targets |
| ARCHITECTURE.md | `docs/ARCHITECTURE.md` | Data flow, module APIs, state machine, scoring algorithm |
| IMPLEMENTATION_PLAN.md | `docs/IMPLEMENTATION_PLAN.md` | Tech stack, project structure, key decisions, model strategy |
| TASK.md | `docs/TASK.md` | Task checklist, progress tracking, blockers |

---

## สิ่งที่ตัดสินใจแล้ว

| Decision | ค่า |
|----------|-----|
| มุมกล้อง | ด้านหน้าห่วง (front-facing) |
| Accuracy target | ≥ 80% mAP@50 |
| Model strategy | Pre-trained → Fine-tune ถ้า accuracy < 80% (ดู SPEC.md Section 3.2.1) |
| inferencejs | รันใน browser ฟรี ไม่เสีย credits |

---

## 📋 1. Project Setup & Infrastructure

### Prompt
```
📖 อ่านไฟล์เหล่านี้ก่อนเริ่มทำ:
1. .agents/skills/hoop-shot-counter/SKILL.md — ดู Section "Setup Instructions" + "Project Structure"
2. docs/IMPLEMENTATION_PLAN.md — ดู Section "Project Structure"
3. docs/TASK.md — ดู Task 1 checklist

จากนั้นทำ Task 1 — Project Setup & Infrastructure:
- npm init -y
- ติดตั้ง: inferencejs, vite (devDep)
- สร้าง vite.config.js
- สร้าง folder structure ตาม docs/IMPLEMENTATION_PLAN.md:
  src/ (main.js, camera.js, detector.js, shot-tracker.js, sound-manager.js, ui.js, config.js)
  styles/ (index.css)
  sounds/ (ว่างไว้ก่อน)
- สร้าง index.html boilerplate (script type="module" src="/src/main.js")
- ตั้ง package.json scripts: dev, build

อัปเดต docs/TASK.md เมื่อทำเสร็จแต่ละ item ([ ] → [x])
```

### ✅ Verification
| ตรวจ | วิธี |
|------|------|
| package.json มี inferencejs + vite | เปิด package.json |
| node_modules/ มี | `ls node_modules` |
| vite.config.js มี | เปิดไฟล์ |
| Folders: src/, styles/, sounds/ | `tree /F` |
| index.html มี script tag | เปิดดู |
| `npm run dev` ทำงาน | รัน แล้วเปิด localhost:5173 |
| TASK.md Task 1 ทุก item เป็น [x] | เปิดดู |

### Prompt ตรวจ
```
📖 อ่านไฟล์เหล่านี้ก่อนตรวจ:
1. docs/IMPLEMENTATION_PLAN.md — ดู Section "Project Structure"
2. docs/TASK.md — ดู Task 1 checklist

ตรวจสอบ Task 1:
1. เปิด package.json → มี inferencejs + vite ไหม
2. รัน npm run dev → Vite server ขึ้นไหม
3. ตรวจ folder structure ตรงกับ IMPLEMENTATION_PLAN.md ไหม
4. เปิด index.html → script tag ถูกไหม
5. รายงานเป็น table: ผ่าน/ไม่ผ่าน
```

---

## 📋 2. Styling & Design System

### Prompt
```
📖 อ่านไฟล์เหล่านี้ก่อนเริ่มทำ:
1. docs/SPEC.md — ดู Section 4 (UI/UX Design) ทั้งหมด โดยเฉพาะ 4.3 Visual Design
2. docs/ARCHITECTURE.md — ดู Section 3 (Canvas Overlay Strategy)
3. docs/TASK.md — ดู Task 2 checklist

จากนั้นทำ Task 2 — Styling & Design System:

สร้าง styles/index.css:
- Dark theme (#1A1A2E background)
- Basketball colors (#FF6B35 orange, #1A1A2E dark)
- Google Fonts: Inter + Outfit
- Camera container: video + canvas ซ้อนกัน (ตาม ARCHITECTURE.md Section 3)
- Score counter: ตัวเลขใหญ่ + glow effect
- Settings panel: glassmorphism + slide-in animation
- Responsive: desktop + mobile
- Buttons & controls
- @keyframes: pulse, glow, slide

อัปเดต docs/TASK.md
```

### ✅ Verification
| ตรวจ | วิธี |
|------|------|
| styles/index.css มี | เปิดไฟล์ |
| CSS variables สำหรับ colors | grep `--` |
| Google Fonts @import | บรรทัดแรก |
| .camera-container layout | ดู position: relative + absolute |
| Score glow effect | ดู text-shadow / box-shadow |
| Glassmorphism | ดู backdrop-filter |
| @media queries | ดู responsive breakpoints |
| @keyframes | ดู animations |
| เปิด browser ดู | npm run dev → ดู layout |

### Prompt ตรวจ
```
📖 อ่านไฟล์เหล่านี้ก่อนตรวจ:
1. docs/SPEC.md — ดู Section 4.3 (Visual Design)
2. docs/ARCHITECTURE.md — ดู Section 3 (Canvas Overlay Strategy)

ตรวจสอบ Task 2:
1. เปิด styles/index.css → dark theme, colors, fonts มีครบไหม
2. camera container ตรงกับ ARCHITECTURE.md Section 3 ไหม
3. glassmorphism + animations ครบไหม
4. รัน dev server → เปิด browser ดู layout
5. Resize ดู responsive
6. รายงานเป็น table
```

---

## 📋 3. Camera Module

### Prompt
```
📖 อ่านไฟล์เหล่านี้ก่อนเริ่มทำ:
1. docs/ARCHITECTURE.md — ดู Section 2.2 (camera.js — Camera Manager) ให้ครบทุก method
2. docs/SPEC.md — ดู Section 3.1 (Camera System)
3. docs/TASK.md — ดู Task 3 checklist

จากนั้นทำ Task 3 — Camera Module:

สร้าง src/camera.js ตาม API ใน ARCHITECTURE.md Section 2.2:
- class CameraManager (export)
- start(deviceId?) → getUserMedia + error handling
- stop() → หยุด stream
- listDevices() → enumerateDevices, filter videoinput
- switchCamera(deviceId) → สลับกล้อง
- getVideoElement() → return <video>
- onError(callback), onReady(callback)
- Constraints: ideal 1280x720, facingMode 'environment' (mobile)
- Error fallback UI

อัปเดต docs/TASK.md
```

### ✅ Verification
| ตรวจ | วิธี |
|------|------|
| src/camera.js มี | เปิดไฟล์ |
| export class CameraManager | ดู export |
| start() ใช้ getUserMedia | ดู method |
| listDevices() ใช้ enumerateDevices | ดู method |
| switchCamera() logic | ดู method |
| try/catch + onError | ดู error handling |
| Resolution 1280x720 | ดู constraints |
| เปิด browser → เห็น video feed | ทดสอบกล้อง |

### Prompt ตรวจ
```
📖 อ่านไฟล์นี้ก่อนตรวจ:
1. docs/ARCHITECTURE.md — ดู Section 2.2 (camera.js API)

ตรวจสอบ Task 3:
1. เปิด src/camera.js → API ตรงกับ ARCHITECTURE.md Section 2.2 ไหม (ทุก method)
2. error handling ครบไหม (denied, not available)
3. resolution constraints ถูกไหม
4. wire เข้า main.js → รัน dev server → กล้องเปิดได้ไหม
5. รายงานเป็น table
```

---

## 📋 4. Object Detection

> **ต้องมี Roboflow API Key ก่อน** — สมัคร https://roboflow.com (ฟรี)

### Prompt
```
📖 อ่านไฟล์เหล่านี้ก่อนเริ่มทำ:
1. docs/ARCHITECTURE.md — ดู Section 2.3 (detector.js — Object Detector) ครบทุก method
2. docs/SPEC.md — ดู Section 3.2 (Object Detection) + Section 3.2.1 (Model Strategy)
3. docs/SPEC.md — ดู Section 5 (Configuration) สำหรับ DEFAULT_CONFIG
4. docs/TASK.md — ดู Task 4 checklist

จากนั้นทำ Task 4 — Object Detection:

สร้าง src/detector.js ตาม API ใน ARCHITECTURE.md Section 2.3:
- class ObjectDetector (export)
- loadModel(modelId, apiKey) → InferenceEngine จาก inferencejs
- detect(videoElement) → return [{ class, bbox: {x,y,width,height}, confidence }]
- setConfidence(threshold)
- isReady() → boolean
- Throttle inference 10-15 FPS
- Error handling: model load failure

สร้าง src/config.js ตาม SPEC.md Section 5:
- DEFAULT_CONFIG ครบทุก field ตามที่ระบุใน SPEC
- API Key ใส่ placeholder 'YOUR_PUBLISHABLE_KEY'

Model strategy (ดู SPEC.md Section 3.2.1):
- ใช้ Pre-trained จาก Roboflow Universe
- ค้นหา model ที่มี classes: basketball + rim
- mAP ≥ 80%, มุมกล้อง: ด้านหน้า
- ถ้า accuracy < 80% จะ fine-tune ทีหลัง (เปลี่ยนแค่ modelId ใน config.js)

อัปเดต docs/TASK.md
```

### ✅ Verification
| ตรวจ | วิธี |
|------|------|
| src/detector.js มี | เปิดไฟล์ |
| src/config.js มี DEFAULT_CONFIG | เทียบกับ SPEC.md Section 5 |
| InferenceEngine import | ดู import statement |
| Throttle logic | ดู detect method |
| setConfidence() | ดู method |
| Error handling | ดู try/catch ใน loadModel |
| ใส่ API Key → model loaded | ต้องมี real key (console log) |

### Prompt ตรวจ
```
📖 อ่านไฟล์เหล่านี้ก่อนตรวจ:
1. docs/ARCHITECTURE.md — ดู Section 2.3 (detector.js API)
2. docs/SPEC.md — ดู Section 5 (Configuration)

ตรวจสอบ Task 4:
1. src/detector.js → API ตรงกับ ARCHITECTURE.md Section 2.3 ไหม (ทุก method)
2. src/config.js → DEFAULT_CONFIG ตรงกับ SPEC.md Section 5 ไหม (ทุก field)
3. throttle mechanism ถูกไหม
4. error handling ครบไหม
5. (ถ้ามี API key) รัน → model โหลดสำเร็จไหม
6. รายงานเป็น table
```

---

## 📋 5. Shot Tracking

### Prompt
```
📖 อ่านไฟล์เหล่านี้ก่อนเริ่มทำ:
1. docs/ARCHITECTURE.md — ดู Section 2.4 (shot-tracker.js) ครบทั้ง API, state machine diagram, และ scoring algorithm (checkScore pseudocode)
2. docs/SPEC.md — ดู Section 3.3 (Shot Detection Algorithm) ทั้ง state table และ score conditions
3. docs/TASK.md — ดู Task 5 checklist

จากนั้นทำ Task 5 — Shot Tracking:

สร้าง src/shot-tracker.js ตาม API ใน ARCHITECTURE.md Section 2.4:
- class ShotTracker (export)
- update(rimDetection, ballDetection) → return true ถ้า scored
- reset() → state = IDLE, score = 0
- getState() → state ปัจจุบัน
- getScore() → คะแนนปัจจุบัน
- setCooldown(ms)

State machine (ดู diagram ใน ARCHITECTURE.md Section 2.4):
IDLE → TRACKING → BALL_ABOVE → SCORED → COOLDOWN → IDLE

Scoring algorithm (ดู checkScore pseudocode ใน ARCHITECTURE.md Section 2.4):
- X alignment: ballCenterX vs rimCenterX ภายใน rim.width * 0.6
- Downward crossing: previousBallY < rimCenterY && ballCenterY > rimCenterY
- Cooldown 2 วินาที (จาก config)

อัปเดต docs/TASK.md
```

### ✅ Verification
| ตรวจ | วิธี |
|------|------|
| src/shot-tracker.js มี | เปิดไฟล์ |
| 5 states ครบ | ดู update() logic |
| IDLE → TRACKING: proximity check | ดู 2x rim width |
| TRACKING → BALL_ABOVE: Y comparison | ดู centroid above rim |
| BALL_ABOVE → SCORED: cross + X align | ดู scoring condition |
| SCORED → COOLDOWN: 2s timer | ดู setTimeout/Date.now |
| reset() → IDLE + score=0 | ดู method |
| Ball lost → กลับ IDLE | ดู edge case |

### Prompt ตรวจ
```
📖 อ่านไฟล์นี้ก่อนตรวจ:
1. docs/ARCHITECTURE.md — ดู Section 2.4 ครบทั้ง API, state machine, scoring algorithm

ตรวจสอบ Task 5:
1. src/shot-tracker.js → API ตรงกับ ARCHITECTURE.md Section 2.4 ไหม (ทุก method)
2. state transitions ทุก path ตรงกับ state diagram ไหม
3. scoring algorithm ตรง checkScore pseudocode ไหม
4. cooldown mechanism ถูกไหม
5. edge cases: ball หาย, rim หาย → กลับ IDLE ไหม
6. รายงานเป็น table
```

---

## 📋 6. Sound System

### Prompt
```
📖 อ่านไฟล์เหล่านี้ก่อนเริ่มทำ:
1. docs/ARCHITECTURE.md — ดู Section 2.5 (sound-manager.js — Audio System) ครบทุก method + implementation notes
2. docs/SPEC.md — ดู Section 3.4 (Sound System)
3. .agents/skills/hoop-shot-counter/SKILL.md — ดู Section "Sound Effects" สำหรับชื่อไฟล์ + format
4. docs/TASK.md — ดู Task 6 checklist

จากนั้นทำ Task 6 — Sound System:

สร้าง src/sound-manager.js ตาม API ใน ARCHITECTURE.md Section 2.5:
- class SoundManager (export)
- init() → สร้าง AudioContext + preload
- loadBuiltinSounds() → decode sounds/swoosh.mp3, buzzer.mp3, crowd-cheer.mp3
- loadCustomSound(file) → File API → decodeAudioData
- playScoreSound() → AudioBufferSourceNode → GainNode → destination
- setActiveSound(soundId)
- setVolume(level) → GainNode.gain.value
- getAvailableSounds()
- AudioContext resume on user interaction (ดู implementation notes ใน ARCHITECTURE.md)

ค้นหาและดาวน์โหลดไฟล์เสียง free license:
- sounds/swoosh.mp3
- sounds/buzzer.mp3
- sounds/crowd-cheer.mp3

อัปเดต docs/TASK.md
```

### ✅ Verification
| ตรวจ | วิธี |
|------|------|
| src/sound-manager.js มี | เปิดไฟล์ |
| sounds/ มี 3 ไฟล์ | ls sounds/ |
| AudioContext ใน init | ดู constructor/init |
| Pre-decode ทุกเสียง | ดู loadBuiltinSounds |
| GainNode volume | ดู setVolume |
| Custom upload decode | ดู loadCustomSound |
| Resume AudioContext | ดู user interaction handler |
| เล่นเสียงได้จริง | ทดสอบใน browser |

### Prompt ตรวจ
```
📖 อ่านไฟล์นี้ก่อนตรวจ:
1. docs/ARCHITECTURE.md — ดู Section 2.5 (sound-manager.js API + implementation notes)

ตรวจสอบ Task 6:
1. src/sound-manager.js → API ตรงกับ ARCHITECTURE.md Section 2.5 ไหม (ทุก method)
2. sounds/ มี 3 ไฟล์เสียงไหม
3. AudioContext resume mechanism ตรง implementation notes ไหม
4. GainNode volume control ถูกไหม
5. custom upload flow ถูกไหม
6. ทดสอบเสียงใน browser
7. รายงานเป็น table
```

---

## 📋 7. UI Controller

### Prompt
```
📖 อ่านไฟล์เหล่านี้ก่อนเริ่มทำ:
1. docs/ARCHITECTURE.md — ดู Section 2.6 (ui.js — UI Controller) ครบทุก method
2. docs/ARCHITECTURE.md — ดู Section 3 (Canvas Overlay Strategy) สำหรับ bounding box colors + CSS layout
3. docs/SPEC.md — ดู Section 4 ทั้งหมด (4.1 Layout, 4.2 Settings Panel, 4.3 Visual Design)
4. docs/TASK.md — ดู Task 7 checklist

จากนั้นทำ Task 7 — UI Controller:

สร้าง src/ui.js ตาม API ใน ARCHITECTURE.md Section 2.6:
- class UIController (export)
- initCanvas(videoElement) → ซิงค์ canvas.width/height ตาม video.videoWidth/video.videoHeight
- drawDetections(canvas, detections) → rim=สีเขียว #00FF88, ball=สีส้ม #FF6B35 (ดู ARCHITECTURE.md Section 3)
- incrementScore() → animation pulse+glow
- resetScore()
- showSettings() / hideSettings() → slide-in
- showError(message)
- showLoading(message)
- setStatus(text)
- Event Binding: bindReset, bindCameraChange, bindSoundChange, bindVolumeChange, bindSensitivityChange

อัปเดต index.html markup ตาม layout ใน SPEC.md Section 4.1 + 4.2:
- Header: logo + score + settings button
- Camera container: video + canvas (ดู ARCHITECTURE.md Section 3 สำหรับ HTML structure)
- Controls: camera dropdown + reset
- Settings panel: sound radio, volume slider, sensitivity slider, camera select
- ทุก interactive element ต้องมี unique ID

อัปเดต docs/TASK.md
```

### ✅ Verification
| ตรวจ | วิธี |
|------|------|
| src/ui.js มี | เปิดไฟล์ |
| drawDetections colors ถูก | ดู #00FF88 + #FF6B35 |
| Score animation | ดู incrementScore |
| Settings toggle | ดู show/hideSettings |
| index.html markup ครบ | เทียบกับ SPEC.md Section 4 |
| Unique IDs ทุก element | ดู HTML |
| Browser → UI สวย | รัน dev server |
| Settings panel เปิด/ปิดได้ | คลิก ⚙️ |

### Prompt ตรวจ
```
📖 อ่านไฟล์เหล่านี้ก่อนตรวจ:
1. docs/ARCHITECTURE.md — ดู Section 2.6 (ui.js API) + Section 3 (Canvas Overlay)
2. docs/SPEC.md — ดู Section 4 (Layout + Settings Panel + Visual Design)

ตรวจสอบ Task 7:
1. src/ui.js → API ตรงกับ ARCHITECTURE.md Section 2.6 ไหม (ทุก method)
2. bounding box colors ตรง ARCHITECTURE.md Section 3 ไหม (#00FF88, #FF6B35)
3. index.html markup ตรง SPEC.md Section 4.1 + 4.2 ไหม
4. รัน dev server → UI สวย premium ไหม (dark theme, glow, glassmorphism)
5. settings panel smooth ไหม
6. unique IDs ครบไหม
7. รายงานเป็น table
```

---

## 📋 8. Main App Integration

### Prompt
```
📖 อ่านไฟล์เหล่านี้ก่อนเริ่มทำ:
1. docs/ARCHITECTURE.md — ดู Section 2.1 (main.js — Application Controller) ทั้ง pseudocode
2. docs/ARCHITECTURE.md — ดู Section 1.2 (Module Dependency Graph) สำหรับ mediator pattern
3. docs/ARCHITECTURE.md — ดู Section 4 (Event Flow — Score Sequence)
4. docs/TASK.md — ดู Task 8 checklist

จากนั้นทำ Task 8 — Main App Integration:

สร้าง/อัปเดต src/main.js ตาม pseudocode ใน ARCHITECTURE.md Section 2.1:
- Init sequence: config → camera → detector → sound → ui
- Main loop: requestAnimationFrame (ตาม pseudocode)
- Mediator pattern (ดู dependency graph Section 1.2): main.js ประสาน modules ทั้งหมด ไม่มี module import กัน ยกเว้น config
- Event wiring ตาม Section 4:
  - scored → soundManager.playScoreSound() + ui.incrementScore()
- UI events: settings toggle, camera select, sound select, volume, sensitivity, reset

อัปเดต docs/TASK.md
```

### ✅ Verification
| ตรวจ | วิธี |
|------|------|
| Init sequence ถูก | ดู initialization order |
| requestAnimationFrame loop | ดู main loop |
| Mediator pattern | ตรวจว่า modules ไม่ import กัน |
| Score → sound + UI wired | ดู if (scored) block |
| UI events hooked | ดู event listeners |
| แอปทำงานครบ loop | เปิด browser ดู |

### Prompt ตรวจ
```
📖 อ่านไฟล์เหล่านี้ก่อนตรวจ:
1. docs/ARCHITECTURE.md — ดู Section 2.1 (pseudocode) + Section 1.2 (dependency graph) + Section 4 (event flow)

ตรวจสอบ Task 8:
1. src/main.js → init sequence ถูกไหม
2. main loop ตรง pseudocode ใน ARCHITECTURE.md Section 2.1 ไหม
3. module dependency ตรง Section 1.2 ไหม: ไม่มี module import กัน (ยกเว้น config)
4. event wiring ตรง Section 4 ไหม (score, settings, camera, reset)
5. รัน dev server → ทุกอย่างทำงานร่วมกันไหม
6. รายงานเป็น table
```

---

## 📋 9. Testing & Polish

### Prompt
```
📖 อ่านไฟล์เหล่านี้ก่อนเริ่มทดสอบ:
1. .agents/skills/hoop-shot-counter/SKILL.md — ดู Section "Testing" → Manual Testing Checklist
2. docs/SPEC.md — ดู Section 7 (Performance Targets)
3. docs/SPEC.md — ดู Section 6 (Error Handling) ทุก scenario
4. docs/TASK.md — ดู Task 9 checklist

จากนั้นทำ Task 9 — Testing & Polish:

ทดสอบตาม checklist ใน SKILL.md:
1. กล้องเปิดได้ + เห็น video feed
2. Model โหลดสำเร็จ (console)
3. เล็งห่วง → bounding box สีเขียว
4. ลูกบาส → bounding box สีส้ม
5. ชู้ตลง → เสียง + คะแนนเพิ่ม
6. เปลี่ยนเสียง → ทำงาน
7. ปรับ volume → ทำงาน
8. Custom upload → ทำงาน
9. Reset → คะแนน = 0
10. Responsive mobile
11. Performance ≥ 10 FPS (ตรวจตาม SPEC.md Section 7)

ตรวจ error handling ตาม SPEC.md Section 6
แก้ไขปัญหาที่พบ
อัปเดต docs/TASK.md
```

---

## 🔁 Prompt ทำต่อจากที่ค้างไว้

```
📖 อ่านไฟล์เหล่านี้ก่อนเริ่มทำ:
1. docs/TASK.md — ดูว่า item ไหนยัง [ ] อยู่
2. docs/ARCHITECTURE.md — ดูทั้งไฟล์เพื่อเข้าใจ module APIs + data flow
3. docs/SPEC.md — ดูทั้งไฟล์เพื่อเข้าใจ feature specs
4. .agents/skills/hoop-shot-counter/SKILL.md — ดู Section "Development Guidelines"

จากนั้นทำงานต่อจากที่ค้าง — ทำเรียงตาม Task number

ทุก Task:
- ก่อนทำแต่ละ Task ให้อ่าน section ที่เกี่ยวข้องใน ARCHITECTURE.md + SPEC.md ก่อนเสมอ
- อัปเดต TASK.md เมื่อทำเสร็จแต่ละ item ([ ] → [x])
- อัปเดต Progress Summary table

เสร็จแต่ละ Task ให้รายงาน: สิ่งที่ทำ, ไฟล์ที่สร้าง/แก้, สิ่งที่ต้อง verify
```

---

## 🔍 Prompt ตรวจทั้งโปรเจค

```
📖 อ่านไฟล์เหล่านี้ก่อนตรวจ:
1. docs/ARCHITECTURE.md — ดูทั้งไฟล์ (ทุก module API + data flow + state machine)
2. docs/SPEC.md — ดูทั้งไฟล์ (ทุก feature spec + config + performance targets)
3. docs/IMPLEMENTATION_PLAN.md — ดู Section "Project Structure"
4. docs/TASK.md — ดู checklist ทุก Task

ตรวจสอบโปรเจค Hoop Shot Counter ทั้งหมด:

1. Folder structure ตรง IMPLEMENTATION_PLAN.md ไหม
2. แต่ละ module API ตรง ARCHITECTURE.md ไหม:
   - camera.js → Section 2.2
   - detector.js → Section 2.3
   - shot-tracker.js → Section 2.4
   - sound-manager.js → Section 2.5
   - ui.js → Section 2.6
   - main.js → Section 2.1
   - config.js → SPEC.md Section 5
3. Module dependency ตรง ARCHITECTURE.md Section 1.2 ไหม (Mediator Pattern)
4. index.html markup ตรง SPEC.md Section 4 ไหม
5. styles/index.css ครบ (dark theme, colors, animations, responsive) ไหม
6. TASK.md ทุก item เป็น [x] ไหม
7. npm run dev ทำงานไหม
8. รายงานเป็น table แยกตาม component
```

---

## ⚡ Agent Response Style (Caveman Mode / Concise Rule)

หากต้องการให้ Agent ตอบสั้น กระชับ ตรงประเด็น และประหยัด Token สูงสุด สามารถใส่คำสั่งนี้ใน Prompt หรือตั้งเป็น Rule ถาวร:

```
# Response Style Directive
- Be extremely concise and direct (Caveman style).
- No greetings, no polite preambles, no conversational fluff.
- Focus strictly on file changes, terminal outputs, and next actionable steps.
- Use bullet points and minimal text.
```

---

## 💡 Tips

- **ทำทีละ Task** — ตรวจสอบก่อนไปต่อ ดีกว่าสั่งรวดเดียว
- **📖 อ่านก่อนทำเสมอ** — บอก agent อ่าน docs + section ที่ชัดเจน จะได้ผลตรง spec
- **Blocker:** ต้องสมัคร Roboflow + หา model ก่อน Task 4
- **Model เปลี่ยนง่าย:** แก้แค่ modelId ใน config.js — โค้ดออกแบบ model-agnostic
- **Fine-tune ถ้าจำเป็น:** ดู SPEC.md Section 3.2.1 สำหรับ plan ครบ

