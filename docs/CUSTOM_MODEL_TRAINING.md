# 🏀 Custom Model Training Plan

> แผนการเทรนโมเดล Object Detection ขนาดเล็กสำหรับ Hoop Shot Counter  
> เป้าหมาย: โมเดลเล็ก รันได้ 30-60+ FPS บนมือถือผ่าน WebGPU/WASM

---

## 1. ที่มาและเหตุผล

ปัจจุบันแอปรองรับ 5 โมเดล (ดู [`src/config.js`](../src/config.js)):

| Preset | Provider | ข้อจำกัด |
|---|---|---|
| **Roboflow v4: Main** | Cloud API | ต้องมีเน็ต, latency ขึ้นกับ server |
| **Local ONNX: Swish-Vision** | Local ONNX (11.7 MB) | ตรวจจับได้แค่ basketball + hoop |
| **Cricket 9.5K** | Cloud API | ช้ากว่า (ชุดข้อมูลใหญ่แต่ไม่มี made-basket) |
| **Devin Ross** | Cloud API | มี made-basket แต่ไม่มี hoop class แยก |
| **Custom** | Cloud API | ต้อง config เอง |

### ปัญหาที่ต้องการแก้
- โมเดล Cloud ต้องพึ่งเน็ตตลอด → ไม่เหมาะสนามกลางแจ้ง
- Swish-Vision (Local) ไม่มี `made-basket` class → นับแต้มแม่นยำน้อยลง
- ต้องการโมเดลที่รวม **ทุก class ที่จำเป็น** ไว้ในตัวเดียว และ**รันออฟไลน์**ได้

### เป้าหมาย
> เทรนโมเดลเล็ก (~5-6 MB) ที่ตรวจจับ `basketball`, `hoop`, `made-basket` ได้ครบ  
> รันบน Web Worker ผ่าน ONNX Runtime (WebGPU/WASM) ที่ 30-60+ FPS

---

## 2. แหล่ง Dataset ที่จะนำมารวม

| แหล่ง | Roboflow Model ID | จำนวนรูป | Classes | จุดเด่น |
|---|---|---|---|---|
| **Cricket 9.5K** | `cricket-qnb5l/basketball-xil7x/1` | ~9,500 | basketball, hoop | ชุดใหญ่ หลากมุมกล้อง หลายสนาม |
| **Devin Ross** | `devin-ross-g0rqc/basketball-ls818/15` | ~8,150 | basketball, made-basket | มี class "ลูกลงห่วง" สำคัญมาก |
| **รวมทั้งหมด** | — | **~17,650** | **basketball, hoop, made-basket** | ครอบคลุมทุกสถานการณ์ |

> [!WARNING]
> **Class Mapping ต้องตรงกัน** — ทั้ง 2 dataset อาจตั้งชื่อ class ต่างกัน (เช่น `Basketball` vs `basketball`, `rim` vs `hoop`)  
> ต้อง remap ให้ uniform **ก่อน** merge dataset

### แผนการจัดการ Classes

```
Target Classes (3 classes):
├── 0: basketball     ← map จาก "Basketball", "ball", "basketball" ทั้ง 2 datasets
├── 1: hoop           ← map จาก "Hoop", "rim", "basket" (จาก Cricket เป็นหลัก)
└── 2: made-basket    ← map จาก "Made Basket", "made_basket" (จาก Devin Ross)
```

> [!IMPORTANT]
> Devin Ross dataset **ไม่มี "hoop" class แยก** → ต้องพึ่ง Cricket dataset สำหรับ hoop detection  
> ถ้าอยากได้ hoop annotations เพิ่มจาก Devin Ross ต้อง annotate เองบน Roboflow

---

## 3. เปรียบเทียบ YOLO Architecture

### ตารางเปรียบเทียบ Nano Models

| โมเดล | Parameters | ONNX Size (FP32) | COCO mAP50-95 | NMS-Free | สถานะ | หมายเหตุ |
|---|---|---|---|---|---|---|
| **YOLOv8n** | ~3.2M | ~6.3 MB | ~37.3 | ❌ ต้องทำ NMS เอง | Stable (2023) | มี community ใหญ่ ตัวอย่างเยอะ |
| **YOLOv10n** | ~2.7M | ~5.8 MB | ~39.5 | ✅ Built-in | Stable (2024) | NMS-free ตัวแรก ลด post-processing |
| **YOLO11n** | ~2.6M | ~5.5 MB | ~39.5 | ✅ Built-in | Stable (2024) | C3k2 block ดีกว่า v10 เล็กน้อย |
| **YOLO26n** | ~2.4M | ~5.0 MB | ~40.9 | ✅ Built-in | **Latest (2026)** | Edge-first, ไม่มี DFL, SOTA |

### 🏆 คำแนะนำ

#### ตัวเลือกที่ 1: **YOLO26n** (แนะนำสุด ⭐)
- **ข้อดี**: เล็กที่สุด (~5 MB), แม่นที่สุด (~40.9 mAP), NMS-free ไม่ต้องเขียน post-processing
- **ข้อดีพิเศษ**: ลบ DFL module → export ONNX สะอาด ใช้กับ Web Worker ได้ง่าย
- **ข้อเสีย**: ใหม่มาก community ยังไม่เยอะ
- **เหมาะกับ**: ต้องการ best performance + อนาคตยาว

#### ตัวเลือกที่ 2: **YOLO11n** (Safe Choice)
- **ข้อดี**: เสถียร มี tutorial เยอะ NMS-free ประสิทธิภาพดี
- **ข้อเสีย**: หนักกว่า YOLO26n เล็กน้อย (~5.5 MB vs ~5.0 MB)
- **เหมาะกับ**: ต้องการ stability + community support

#### ตัวเลือกที่ 3: **YOLOv8n** (Conservative)
- **ข้อดี**: เสถียรที่สุด community ใหญ่ที่สุด tutorial มากที่สุด
- **ข้อเสีย**: ต้องเขียน NMS เอง (มีอยู่แล้วใน `onnx.worker.js`), หนักกว่า (~6.3 MB)
- **เหมาะกับ**: ไม่อยากเสี่ยง ใช้ pipeline เดิมที่มีอยู่

### NMS-Free คืออะไร ทำไมสำคัญ?

```
                  YOLOv8n (NMS Required)
┌─────────┐    ┌──────────┐    ┌─────────┐    ┌──────────┐
│  Input   │───▶│  Model   │───▶│  NMS    │───▶│  Output  │
│  Image   │    │ Inference│    │ Post-   │    │  Boxes   │
└─────────┘    └──────────┘    │ Process │    └──────────┘
                                └─────────┘
                                  ↑ ต้องเขียน JS เอง

              YOLO26n / YOLO11n (NMS-Free)
┌─────────┐    ┌──────────────────────────┐    ┌──────────┐
│  Input   │───▶│  Model + Built-in NMS   │───▶│  Output  │
│  Image   │    │  (End-to-End)           │    │  Boxes   │
└─────────┘    └──────────────────────────┘    └──────────┘
                                                 ↑ ง่ายกว่ามาก!
```

> NMS-Free หมายความว่า ONNX model จะ output bounding boxes ที่ "สะอาด" แล้ว  
> ไม่ต้องเขียน Non-Maximum Suppression ใน JavaScript → **ลดโค้ดใน `onnx.worker.js`** ได้มาก  
> และ **ลด latency** เพราะไม่ต้องทำ post-processing บน CPU

---

## 4. ขั้นตอนการเทรน (Step-by-Step)

### 4.1 เตรียม Environment

```bash
# สร้าง Virtual Environment
python -m venv yolo-train
source yolo-train/bin/activate  # Linux/Mac
# หรือ yolo-train\Scripts\activate  # Windows

# ติดตั้ง Dependencies
pip install ultralytics roboflow
```

### 4.2 Export และ Merge Dataset จาก Roboflow

```python
# download_datasets.py
from roboflow import Roboflow

# --- Config ---
ROBOFLOW_API_KEY = "YOUR_API_KEY"  # ใส่ API Key ของคุณ

rf = Roboflow(api_key=ROBOFLOW_API_KEY)

# Download Cricket 9.5K dataset
cricket_project = rf.workspace("cricket-qnb5l").project("basketball-xil7x")
cricket_dataset = cricket_project.version(1).download("yolov8", location="./datasets/cricket")

# Download Devin Ross dataset
devin_project = rf.workspace("devin-ross-g0rqc").project("basketball-ls818")
devin_dataset = devin_project.version(15).download("yolov8", location="./datasets/devin-ross")

print("✅ Datasets downloaded!")
```

### 4.3 Merge และ Remap Classes

```python
# merge_datasets.py
import os
import shutil
import yaml

# --- Class Mapping ---
# ปรับ mapping ตาม class names จริงของแต่ละ dataset
CRICKET_CLASS_MAP = {
    # original_index: new_index
    # ต้องดูจากไฟล์ data.yaml ของแต่ละ dataset
    # ตัวอย่าง:
    0: 0,  # basketball → basketball
    1: 1,  # hoop → hoop
}

DEVIN_CLASS_MAP = {
    0: 0,  # basketball → basketball
    1: 2,  # made-basket → made-basket
}

TARGET_CLASSES = {
    0: 'basketball',
    1: 'hoop',
    2: 'made-basket',
}

def remap_labels(src_dir, dst_dir, class_map):
    """Remap class indices in YOLO label files."""
    os.makedirs(dst_dir, exist_ok=True)
    for fname in os.listdir(src_dir):
        if not fname.endswith('.txt'):
            continue
        with open(os.path.join(src_dir, fname), 'r') as f:
            lines = f.readlines()
        new_lines = []
        for line in lines:
            parts = line.strip().split()
            if len(parts) < 5:
                continue
            old_cls = int(parts[0])
            if old_cls in class_map:
                parts[0] = str(class_map[old_cls])
                new_lines.append(' '.join(parts) + '\n')
        with open(os.path.join(dst_dir, fname), 'w') as f:
            f.writelines(new_lines)

def merge_split(split_name, cricket_dir, devin_dir, merged_dir):
    """Merge images and labels for a given split (train/valid/test)."""
    for subdir in ['images', 'labels']:
        dst = os.path.join(merged_dir, split_name, subdir)
        os.makedirs(dst, exist_ok=True)

        # Copy Cricket images / remap labels
        cricket_path = os.path.join(cricket_dir, split_name, subdir)
        if os.path.exists(cricket_path):
            if subdir == 'labels':
                remap_labels(cricket_path, dst, CRICKET_CLASS_MAP)
            else:
                for f in os.listdir(cricket_path):
                    shutil.copy2(os.path.join(cricket_path, f), os.path.join(dst, f'cricket_{f}'))

        # Copy Devin Ross images / remap labels
        devin_path = os.path.join(devin_dir, split_name, subdir)
        if os.path.exists(devin_path):
            if subdir == 'labels':
                remap_labels(devin_path, dst, DEVIN_CLASS_MAP)
            else:
                for f in os.listdir(devin_path):
                    shutil.copy2(os.path.join(devin_path, f), os.path.join(dst, f'devin_{f}'))

# --- Execute Merge ---
CRICKET_DIR = './datasets/cricket'
DEVIN_DIR = './datasets/devin-ross'
MERGED_DIR = './datasets/merged'

for split in ['train', 'valid', 'test']:
    merge_split(split, CRICKET_DIR, DEVIN_DIR, MERGED_DIR)

# Generate data.yaml
data_yaml = {
    'path': os.path.abspath(MERGED_DIR),
    'train': 'train/images',
    'val': 'valid/images',
    'test': 'test/images',
    'nc': len(TARGET_CLASSES),
    'names': list(TARGET_CLASSES.values()),
}

with open(os.path.join(MERGED_DIR, 'data.yaml'), 'w') as f:
    yaml.dump(data_yaml, f, default_flow_style=False)

print(f"✅ Merged dataset: {MERGED_DIR}")
print(f"   Classes: {TARGET_CLASSES}")
```

### 4.4 เทรนโมเดล

#### Option A: YOLO26n (แนะนำ)
```bash
yolo detect train \
  model=yolo26n.pt \
  data=datasets/merged/data.yaml \
  epochs=100 \
  imgsz=640 \
  batch=16 \
  device=0 \
  patience=20 \
  lr0=0.01 \
  augment=True \
  mosaic=1.0 \
  mixup=0.15 \
  copy_paste=0.1 \
  name=hoop-yolo26n
```

#### Option B: YOLO11n
```bash
yolo detect train \
  model=yolo11n.pt \
  data=datasets/merged/data.yaml \
  epochs=100 \
  imgsz=640 \
  batch=16 \
  device=0 \
  patience=20 \
  name=hoop-yolo11n
```

#### Option C: YOLOv8n (Conservative)
```bash
yolo detect train \
  model=yolov8n.pt \
  data=datasets/merged/data.yaml \
  epochs=100 \
  imgsz=640 \
  batch=16 \
  device=0 \
  patience=20 \
  name=hoop-yolov8n
```

### 4.5 ตรวจสอบผลเทรน

```bash
# ดู metrics
yolo detect val model=runs/detect/hoop-yolo26n/weights/best.pt data=datasets/merged/data.yaml

# ทดสอบกับรูปตัวอย่าง
yolo detect predict model=runs/detect/hoop-yolo26n/weights/best.pt source=test_images/ save=True
```

> [!TIP]
> **ค่า mAP50 ที่ควรได้**:
> - `basketball`: ≥ 0.85 (ตรวจจับง่าย สีส้มชัด)
> - `hoop`: ≥ 0.80 (ค่อนข้างชัดเจน)
> - `made-basket`: ≥ 0.65 (ยากที่สุด เกิดแค่ช่วงสั้นๆ)

### 4.6 Export เป็น ONNX

#### สำหรับ YOLO26n / YOLO11n (NMS-Free)
```bash
yolo export \
  model=runs/detect/hoop-yolo26n/weights/best.pt \
  format=onnx \
  imgsz=640 \
  simplify=True \
  opset=17
```

#### สำหรับ YOLOv8n (ต้อง NMS)
```bash
yolo export \
  model=runs/detect/hoop-yolov8n/weights/best.pt \
  format=onnx \
  imgsz=640 \
  simplify=True \
  opset=17
```

### 4.7 (Optional) Quantize เป็น FP16

```python
# quantize_fp16.py
import onnx
from onnxconverter_common import float16

model = onnx.load("runs/detect/hoop-yolo26n/weights/best.onnx")
model_fp16 = float16.convert_float_to_float16(model)
onnx.save(model_fp16, "hoop-yolo26n-fp16.onnx")
print("✅ FP16 model saved! Size reduced ~50%")
```

> FP16 จะลดขนาดลงเหลือ ~2.5 MB แต่ต้องทดสอบว่า accuracy ไม่ลดลงมาก

---

## 5. เทรนบน Google Colab (ฟรี GPU)

ถ้าไม่มี GPU ในเครื่อง สามารถเทรนบน Google Colab ได้ฟรี:

```python
# === Google Colab Notebook ===

# Cell 1: Install
!pip install ultralytics roboflow

# Cell 2: Download Datasets
from roboflow import Roboflow
rf = Roboflow(api_key="YOUR_API_KEY")

# Cricket 9.5K
cricket = rf.workspace("cricket-qnb5l").project("basketball-xil7x")
cricket.version(1).download("yolov8", location="/content/datasets/cricket")

# Devin Ross
devin = rf.workspace("devin-ross-g0rqc").project("basketball-ls818")
devin.version(15).download("yolov8", location="/content/datasets/devin-ross")

# Cell 3: Merge (ใช้สคริปต์จากข้อ 4.3 ด้านบน)

# Cell 4: Train
!yolo detect train model=yolo26n.pt data=/content/datasets/merged/data.yaml \
  epochs=100 imgsz=640 batch=16 device=0 patience=20 name=hoop-yolo26n

# Cell 5: Export ONNX
!yolo export model=runs/detect/hoop-yolo26n/weights/best.pt \
  format=onnx imgsz=640 simplify=True opset=17

# Cell 6: Download
from google.colab import files
files.download('runs/detect/hoop-yolo26n/weights/best.onnx')
```

> [!TIP]
> Google Colab ฟรีให้ใช้ **T4 GPU** (~16 GB VRAM)  
> เทรน 100 epochs กับ ~17K รูปใช้เวลาประมาณ **2-4 ชั่วโมง**

---

## 6. Integration กับ Hoop Shot Counter

### 6.1 วางไฟล์โมเดล

```
public/
└── models/
    ├── basketball_swish_yolov8.onnx    ← โมเดลเดิม (11.7 MB)
    └── hoop_custom_yolo26n.onnx        ← โมเดลใหม่ (~5 MB) ✨
```

### 6.2 เพิ่ม Preset ใน `src/config.js`

```javascript
// เพิ่มใน MODEL_PRESETS
'local-onnx-custom': {
  id: 'local-onnx-custom',
  name: 'Local ONNX: Custom YOLO26n (⚡ 60+ FPS)',
  provider: 'onnx',
  modelPath: '/models/hoop_custom_yolo26n.onnx',
  description: 'โมเดลเทรนเอง (17K รูป) ตรวจจับ basketball + hoop + made-basket · ออฟไลน์ 100%',
},
```

### 6.3 อัปเดต `onnx.worker.js` (ถ้าเลือก NMS-Free)

ถ้าเทรนด้วย YOLO26n หรือ YOLO11n (NMS-Free) ต้องปรับ post-processing:

```javascript
// ใน src/worker/onnx.worker.js
// แทนที่จะทำ NMS เอง ให้ใช้ output ตรงๆ จากโมเดล

function postProcessNMSFree(output, confidenceThreshold) {
  // YOLO26n / YOLO11n output: [batch, num_detections, 7]
  // แต่ละ detection: [x1, y1, x2, y2, confidence, class_id, ...]
  const detections = [];
  const numDetections = output.dims[1];

  for (let i = 0; i < numDetections; i++) {
    const offset = i * output.dims[2];
    const confidence = output.data[offset + 4];

    if (confidence < confidenceThreshold) continue;

    detections.push({
      x: output.data[offset + 0],
      y: output.data[offset + 1],
      width: output.data[offset + 2] - output.data[offset + 0],
      height: output.data[offset + 3] - output.data[offset + 1],
      confidence: confidence,
      class: Math.round(output.data[offset + 5]),
    });
  }

  return detections;
}
```

> [!WARNING]
> NMS-Free model output format ต่างจาก YOLOv8 แบบเดิมมาก  
> ต้อง**ทดสอบ output shape** ก่อนเขียนโค้ด:
> ```python
> import onnxruntime as ort
> sess = ort.InferenceSession("best.onnx")
> for o in sess.get_outputs():
>     print(o.name, o.shape, o.type)
> ```

### 6.4 Class Name Mapping ใน Shot Tracker

```javascript
// อัปเดตใน src/shot-tracker.js หรือ src/detector.js
const CUSTOM_CLASS_NAMES = {
  0: 'basketball',
  1: 'hoop',        // = rim
  2: 'made-basket', // = ลูกลงห่วง (ใช้แทน raycast crossing ได้)
};
```

> [!TIP]
> ถ้าโมเดลใหม่มี `made-basket` class  
> สามารถใช้เป็น **signal เสริม** ร่วมกับ raycast crossing ที่มีอยู่แล้วใน [`src/shot-tracker.js`](../src/shot-tracker.js)  
> เพื่อลด false positive ได้มาก → **Dual Confirmation System**

---

## 7. Data Augmentation Recommendations

การ augment ที่เหมาะกับ basketball court environment:

| Augmentation | ค่าแนะนำ | เหตุผล |
|---|---|---|
| **Mosaic** | 1.0 | รวมหลายมุมในรูปเดียว เพิ่มความหลากหลาย |
| **MixUp** | 0.15 | ป้องกัน overfitting |
| **Horizontal Flip** | 0.5 | สนามบาสสมมาตร |
| **Brightness** | ±20% | สนามในร่ม/กลางแจ้ง แสงต่างกัน |
| **Blur** | 0-3px | จำลองกล้องมือถือเบลอ |
| **Rotation** | ±10° | มุมกล้องเอียงเล็กน้อย |
| ~~Vertical Flip~~ | ❌ ไม่ใช้ | ลูกบาสไม่ตกจากล่างขึ้นบน |
| ~~Heavy Rotation~~ | ❌ ไม่ใช้ | ห่วงไม่เอียง > 15° |

---

## 8. สรุป Decision Matrix

| เกณฑ์ | YOLOv8n | YOLO11n | YOLO26n ⭐ |
|---|---|---|---|
| **ขนาด ONNX** | ~6.3 MB | ~5.5 MB | **~5.0 MB** |
| **mAP (COCO)** | 37.3 | 39.5 | **40.9** |
| **NMS-Free** | ❌ | ✅ | ✅ |
| **แก้โค้ด worker** | ไม่ต้อง (ใช้เดิม) | ต้องปรับ output parsing | ต้องปรับ output parsing |
| **Community** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **อนาคต** | Legacy | Current | **Latest** |
| **ความเสี่ยง** | ต่ำ | ต่ำ | ปานกลาง |

### คำตัดสินสุดท้าย

> **เลือก YOLO26n** ถ้าต้องการ performance สูงสุด + ขนาดเล็กสุด + NMS-free  
> **เลือก YOLO11n** ถ้าต้องการ balance ระหว่าง performance กับ stability  
> **เลือก YOLOv8n** ถ้าต้องการ drop-in replacement ใช้ `onnx.worker.js` เดิมได้เลยไม่ต้องแก้โค้ด

---

## 9. Timeline ประมาณ

| ขั้นตอน | เวลา | หมายเหตุ |
|---|---|---|
| Export & Merge Datasets | 30 นาที | Roboflow export + remap script |
| Data Validation | 30 นาที | ตรวจสอบ class mapping ถูกต้อง |
| Training (100 epochs) | 2-4 ชั่วโมง | Google Colab T4 GPU |
| Evaluation & Testing | 30 นาที | ดู mAP, confusion matrix |
| ONNX Export | 5 นาที | `yolo export` |
| Integration + Testing | 1-2 ชั่วโมง | วาง ONNX, ปรับ config, ทดสอบ |
| **รวม** | **~5-8 ชั่วโมง** | — |

---

*เอกสารนี้สร้างเมื่อ: 2026-09-01*  
*อ้างอิง: [Ultralytics Docs](https://docs.ultralytics.com/), [Roboflow](https://roboflow.com/)*
