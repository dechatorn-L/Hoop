/**
 * @fileoverview Default configuration & Model Presets for Hoop Shot Counter
 */

export const MODEL_PRESETS = {
  'roboflow-default': {
    id: 'roboflow-default',
    name: 'Roboflow v4: People + Basketball + Hoops (Cloud)',
    provider: 'roboflow',
    modelId: 'people_basketball_hoops/4',
    description: 'ตรวจจับห่วง ลูกบาส และผู้เล่น (โมเดลหลัก Cloud ความเสถียรสูงสุด)',
  },
  'local-onnx-swish-384': {
    id: 'local-onnx-swish-384',
    name: '⚡ Local ONNX: Swish-Vision 384px INT8 (โคตรเร็ว 3.1MB · เหมาะกับมือถือ)',
    provider: 'onnx',
    modelPath: '/models/basketball_swish_384_int8.onnx',
    description: 'ลดขนาดภาพ 384px + ควอนไทซ์ INT8 (3.1 MB) ลดภาระ CPU ลง 70% เร็วขึ้น 3 เท่า เหมาะสำหรับเล่นบนมือถือโดยเฉพาะ',
  },
  'local-onnx-swish': {
    id: 'local-onnx-swish',
    name: 'Local ONNX: Swish-Vision 640px (11.7MB · แม่นยำมาตรฐาน)',
    provider: 'onnx',
    modelPath: '/models/basketball_swish_yolov8.onnx',
    description: 'เทรนจากชุด Basketball-1 (11.7 MB) ความละเอียด 640px มาตรฐาน ล็อกเฉพาะลูกบาสและห่วง ไม่ตีกรอบรวมกับคน',
  },
  'local-onnx-yolo11': {
    id: 'local-onnx-yolo11',
    name: 'Local ONNX: YOLO11s Basketball (ยุคใหม่ 36.2MB - แม่นยำ & Motion Blur)',
    provider: 'onnx',
    modelPath: '/models/basketball_yolo11.onnx',
    description: 'สถาปัตยกรรม YOLO11s ตัวล่าสุด มี Attention C2PSA จับลูกบาสความเร็วสูงและแสงแดดย้อนกลางแจ้งได้ดีเยี่ยม',
  },
  'local-onnx-world': {
    id: 'local-onnx-world',
    name: 'Local ONNX: YOLO-World (47.8MB - Open-Vocabulary ฉลาดสุด)',
    provider: 'onnx',
    modelPath: '/models/basketball_yoloworld.onnx',
    description: 'โมเดล Open-Vocabulary AI วิเคราะห์คลาส basketball, rim, person แยกแยะแม่นยำ ไม่หลอนวัตถุอื่น',
  },
  'local-onnx-pro': {
    id: 'local-onnx-pro',
    name: 'Local ONNX: Pro High-Precision (YOLOv8s 42.7MB - ระยะไกล)',
    provider: 'onnx',
    modelPath: '/models/basketball_rim_focused.onnx',
    description: 'โมเดลขนาดใหญ่ 42.7 MB ความแม่นยำสูง สำหรับตั้งกล้องระยะสนามจริง 3–8 เมตร',
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
  modelType: 'roboflow-default',               // Default preset key from MODEL_PRESETS
  publishableKey: import.meta.env.VITE_ROBOFLOW_API_KEY || '',  // Roboflow Publishable Key
  modelId: import.meta.env.VITE_ROBOFLOW_MODEL_ID || 'people_basketball_hoops/4',
  onnxModelPath: '/models/basketball_yolov8n.onnx',
  confidenceThreshold: 0.35,                   // Min confidence for detection (optimized for fast motion)
  inferenceRate: 20,                           // Inference FPS (throttled)

  // Shot tracking
  scoreCooldownMs: 2000,                       // Cooldown between scores (ms)
  rimProximityFactor: 2.0,                     // Factor of rim width for tracking zone

  // Sound
  defaultSound: 'cha-ching',                   // Default sound effect
  volume: 0.8,                                 // Default volume (0-1)

  // Camera
  preferredResolution: { width: 1280, height: 720 },
  facingMode: 'environment',                   // Back camera on mobile
};
