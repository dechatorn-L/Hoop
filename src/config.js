/**
 * @fileoverview Default configuration & Model Presets for Hoop Shot Counter
 */

export const MODEL_PRESETS = {
  'local-onnx-swish': {
    id: 'local-onnx-swish',
    name: 'Local ONNX: Swish-Vision (ค่าเริ่มต้น · 11.7 MB)',
    provider: 'onnx',
    modelPath: '/models/basketball_swish_yolov8.onnx',
    description: 'ตรวจจับลูกบาสและห่วงบนอุปกรณ์ผ่าน Web Worker ไม่ต้องใช้ API Key',
  },
  'local-onnx-swish-int8': {
    id: 'local-onnx-swish-int8',
    name: 'Local ONNX: Swish INT8 (⚡ 3.3 MB จิ๋วสุด)',
    provider: 'onnx',
    modelPath: '/models/basketball_swish_yolov8_int8.onnx',
    description: 'โมเดลบีบอัด INT8 ขนาด 3.3 MB ยังไม่ได้ยืนยันผลบนอุปกรณ์จริง',
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
  modelType: 'local-onnx-swish',               // Default preset key from MODEL_PRESETS
  publishableKey: import.meta.env.VITE_ROBOFLOW_API_KEY || '',  // Roboflow Publishable Key
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
