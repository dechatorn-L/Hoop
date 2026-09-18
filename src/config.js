/**
 * @fileoverview Default configuration & Model Presets for Hoop Shot Counter
 */

export const MODEL_PRESETS = {
  'roboflow-default': {
    id: 'roboflow-default',
    name: 'Roboflow v4: Main (⚡ 30-45 FPS แนะนำ)',
    provider: 'roboflow',
    modelId: 'people_basketball_hoops/4',
    description: 'ตรวจจับห่วง ลูกบาส และคน (โมเดล Cloud ยอดนิยม · ลื่นไหล 30-45 FPS)',
  },
  'local-onnx-swish': {
    id: 'local-onnx-swish',
    name: 'Local ONNX: Swish-Vision (⚡ 60 FPS แนะนำ)',
    provider: 'onnx',
    modelPath: '/models/basketball_swish_yolov8.onnx',
    description: 'รันบน Web Worker อิสระ (11.7 MB) ล็อกเฉพาะลูกบาสและห่วง ไม่กินสเปกมือถือ (ออฟไลน์ 100% · 60 FPS)',
  },
  'local-onnx-swish-int8': {
    id: 'local-onnx-swish-int8',
    name: 'Local ONNX: Swish INT8 (⚡ 3.3 MB จิ๋วสุด)',
    provider: 'onnx',
    modelPath: '/models/basketball_swish_yolov8_int8.onnx',
    description: 'เวอร์ชันบีบอัด INT8 ขนาดเพียง 3.3 MB (ลดขนาด 73%) รันลื่น โหลดไว ประหยัดแรม (ออฟไลน์ 100%)',
  },
  'roboflow-cricket': {
    id: 'roboflow-cricket',
    name: 'Roboflow: Cricket 9.5K Images (🎯 โมเดลละเอียด)',
    provider: 'roboflow',
    modelId: 'cricket-qnb5l/basketball-xil7x/1',
    description: 'โมเดลชุดใหญ่ 9,500+ รูป (cricket-qnb5l/basketball-xil7x/1 · มีระบบ 60 FPS Interpolator ช่วยประมวลผล)',
  },
  'roboflow-devinross': {
    id: 'roboflow-devinross',
    name: 'Roboflow: Devin Ross (🎯 Made Basket SOTA)',
    provider: 'roboflow',
    modelId: 'devin-ross-g0rqc/basketball-ls818/15',
    description: 'ตรวจจับลูกบาสและจังหวะลูกลงห่วง (Devin Ross 8,150 รูป · เหมาะที่สุดเมื่อใช้ร่วมกับปุ่มล็อกห่วง)',
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
