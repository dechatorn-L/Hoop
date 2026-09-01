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
  'local-onnx-swish': {
    id: 'local-onnx-swish',
    name: 'Local ONNX: Swish-Vision (11.7MB · ออฟไลน์ 100%)',
    provider: 'onnx',
    modelPath: '/models/basketball_swish_yolov8.onnx',
    description: 'เทรนจากชุด Basketball-1 (11.7 MB) ความละเอียด 640px ล็อกเฉพาะลูกบาสและห่วง ไม่ตีกรอบรวมกับคน (Single-Worker)',
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
  onnxModelPath: '/models/basketball_swish_yolov8.onnx',
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
