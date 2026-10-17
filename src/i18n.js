// Paired entries keep both supported languages together. Values are plain text.
export const messages = {
  madeBaskets: ['ลูกที่ลง', 'Made baskets'],
  cameraView: ['ภาพกล้อง', 'Camera view'],
  fullFrame: ['เต็มเฟรม', 'Full frame'],
  controls: ['การควบคุม', 'Controls'],
  secondaryControls: ['ปรับการซ้อม', 'Practice settings'],
  display: ['การแสดงผล', 'Display'],
  appTitle: ['Hoop — ระบบนับคะแนนบาสเกตบอล', 'Hoop — Basketball Shot Counter'],
  appDescription: ['นับคะแนนบาสเกตบอลจากภาพกล้องขณะฝึกซ้อม', 'Count basketball shots from the camera during practice.'],
  points: ['แต้ม', 'PTS'],
  fullscreen: ['เต็มจอ', 'Fullscreen'],
  exitFullscreen: ['ออกจากโหมดเต็มจอ', 'Exit fullscreen'],
  openSettings: ['เปิดการตั้งค่า', 'Open settings'],
  settings: ['การตั้งค่า', 'Settings'],
  closeSettings: ['ปิดการตั้งค่า', 'Close settings'],
  practiceControls: ['ควบคุมการฝึกซ้อม', 'Practice controls'],
  cameraExplanation: ['กดเปิดกล้องเพื่ออนุญาตให้แอปใช้ภาพตรวจจับห่วงและลูกบาส เริ่มนับเมื่อกดเริ่มฝึกซ้อมเท่านั้น', 'Open Camera lets the app use the camera to detect the rim and ball. Counting begins only when you select Start Practice.'],
  openCamera: ['เปิดกล้อง', 'Open Camera'],
  reopenCamera: ['เปิดกล้องอีกครั้ง', 'Reopen Camera'],
  openingCamera: ['กำลังเปิดกล้อง…', 'Opening camera…'],
  startPractice: ['เริ่มฝึกซ้อม', 'Start Practice'],
  pausePractice: ['พักการฝึกซ้อม', 'Pause Practice'],
  resumePractice: ['ฝึกซ้อมต่อ', 'Resume Practice'],
  guideTitle: ['วิธีจัดวางกล้อง', 'Positioning guidance'],
  guideBody: ['วางอุปกรณ์ให้มั่นคงและเห็นห่วงกับทางเดินของลูกบาส ตรวจกรอบห่วงอัตโนมัติ หรือล็อกห่วงเอง แล้วกดเริ่มฝึกซ้อม พักได้โดยคะแนนยังอยู่', 'Place your device securely with the rim and ball path in view. Check the automatic rim box or lock the rim manually, then select Start Practice. Pause keeps your score.'],
  loading: ['กำลังโหลด...', 'Loading…'],
  initializing: ['กำลังเริ่มระบบ...', 'Initializing…'],
  drawInstruction: ['ลากกรอบสี่เหลี่ยมบนห่วงบาส', 'Drag a rectangle around the rim'],
  cancel: ['ยกเลิก', 'Cancel'],
  chooseCamera: ['เลือกกล้อง', 'Choose camera'],
  findingCameras: ['ค้นหากล้อง...', 'Finding cameras…'],
  noCamera: ['ไม่พบกล้อง', 'No camera found'],
  cameraNumber: ['กล้อง {number}', 'Camera {number}'],
  lockRim: ['ล็อกห่วง', 'Lock Rim'],
  editRim: ['แก้ไขห่วง', 'Edit Rim'],
  lockRimTitle: ['กำหนดตำแหน่งห่วงบาส', 'Set the basket rim position'],
  editRimTitle: ['ตำแหน่งห่วงถูกล็อกอยู่ (คลิกเพื่อวาดใหม่)', 'Rim position is locked (select to redraw)'],
  unlockRim: ['ปลดล็อก', 'Unlock'],
  autoRimTitle: ['คืนค่าเป็นระบบอัตโนมัติ', 'Return to automatic rim detection'],
  reset: ['รีเซ็ต', 'Reset'],
  resetTitle: ['รีเซ็ตคะแนนเป็น 0', 'Reset score to 0'],
  resetConfirm: ['รีเซ็ตคะแนนเป็น 0? กล้อง ตำแหน่งห่วง และการตั้งค่าจะยังอยู่', 'Reset score to 0? Camera, rim position, and settings will be kept.'],
  language: ['ภาษา', 'Language'],
  scoreSound: ['เสียงเมื่อลงห่วง', 'Score sound'],
  randomSound: ['สุ่มเสียง', 'Random sound'],
  yourSound: ['ไฟล์เสียงของคุณ', 'Your audio file'],
  uploadSound: ['อัปโหลดไฟล์เสียง', 'Upload custom sound'],
  testSound: ['ทดสอบเสียง', 'Test sound'],
  volume: ['ระดับเสียง', 'Volume'],
  confidence: ['ความไวตรวจจับ (Confidence)', 'Detection confidence'],
  rimPosition: ['ตำแหน่งห่วง', 'Rim position'],
  rimModeAuto: ['โหมด: ตรวจจับอัตโนมัติ', 'Mode: Automatic detection'],
  rimModeLocked: ['โหมด: ล็อกตำแหน่งห่วง', 'Mode: Locked rim position'],
  drawRim: ['ลากตำแหน่งเอง', 'Draw rim manually'],
  returnAuto: ['คืนค่าอัตโนมัติ', 'Use automatic detection'],
  turboDescription: ['ตัดภาพเฉพาะโซนห่วง เร็วขึ้น 3 เท่า', 'Crop to the rim area for up to 3× faster detection'],
  turboLabel: ['เปิดใช้ ROI Turbo', 'Enable ROI Turbo'],
  detectionModel: ['โมเดลตรวจจับ (AI Model)', 'Detection model (AI Model)'],
  modelGuide: ['คู่มือโมเดล', 'Model guide'],
  chooseModel: ['เลือกโมเดลตรวจจับ', 'Choose detection model'],
  presetDefault: ['Roboflow v4: Main (Cloud · แนะนำ)', 'Roboflow v4: Main (Cloud · Recommended)'],
  presetSwish: ['Local ONNX: Swish-Vision (ออฟไลน์ 60 FPS · 11.7 MB)', 'Local ONNX: Swish-Vision (Offline 60 FPS · 11.7 MB)'],
  presetInt8: ['Local ONNX: Swish INT8 (จิ๋ว 3.3 MB · ประหยัดแรม)', 'Local ONNX: Swish INT8 (Compact 3.3 MB · Lower memory)'],
  presetCricket: ['Roboflow: Cricket 9.5K (ละเอียด)', 'Roboflow: Cricket 9.5K (Detailed)'],
  presetDevin: ['Roboflow: Devin Ross (Made Basket)', 'Roboflow: Devin Ross (Made Basket)'],
  presetCustom: ['Roboflow: Custom Model ID', 'Roboflow: Custom Model ID'],
  modelId: ['Model ID (project/version):', 'Model ID (project/version):'],
  modelIdPlaceholder: ['เช่น your-project/1', 'e.g. your-project/1'],
  apiKey: ['Publishable API Key:', 'Publishable API Key:'],
  apiKeyPlaceholder: ['rf_... (เว้นว่างหากใช้ใน .env)', 'rf_... (leave blank to use .env)'],
  applyModel: ['เปลี่ยนโมเดล', 'Change model'],
  guideHeading: ['คู่มือโมเดล AI', 'AI model guide'],
  closeModal: ['ปิดคู่มือโมเดล', 'Close model guide'],
  guideIntro: ['เลือกโมเดลที่เหมาะกับสภาพสนามและการเชื่อมต่อของคุณ:', 'Choose a model for your court conditions and connection:'],
  guideDefault: ['ตรวจจับห่วง ลูกบาส และผู้เล่น แยกแยะคนตัดโอกาสสับสน เหมาะกับสนามทั่วไปที่มีคนยืนใต้แป้น', 'Detects rims, balls, and players. Distinguishes people to reduce confusion on courts with players under the basket.'],
  guideSwish: ['รันในเครื่อง 100% ไม่ต้องต่อเน็ต ลื่นไหล 60 FPS ด้วย WebGPU เหมาะกับการซ้อมยิงคนเดียว', 'Runs entirely on your device without an internet connection. Uses WebGPU for 60 FPS detection during solo practice.'],
  guideCricket: ['ชุดข้อมูลใหญ่ 9,500+ รูป รองรับสภาพแสงที่ยากหรือสนามเปิดโล่ง', 'Uses a dataset of over 9,500 images for difficult lighting and open courts.'],
  guideDevin: ['จับจังหวะลูกลงห่วง (Made Basket) แม่นยำเป็นพิเศษ แนะนำให้ใช้คู่กับปุ่มล็อกห่วง', 'Detects Made Basket events. Recommended with Lock Rim.'],
  close: ['ปิด', 'Close'],
  'model.roboflow-default': ['ตรวจจับห่วง ลูกบาส และผู้เล่น (Roboflow Universe v4 · โมเดลหลัก Cloud ความเสถียรสูงสุด)', 'Detects rims, balls, and players (Roboflow Universe v4 · Main cloud model)'],
  'model.roboflow-cricket': ['โมเดลชุดใหญ่ 9,500+ รูป (cricket-qnb5l/basketball-xil7x/1 · ตรวจจับ ball, person, rim)', 'Model trained on 9,500+ images (cricket-qnb5l/basketball-xil7x/1 · Detects ball, person, rim)'],
  'model.roboflow-devinross': ['ตรวจจับลูกบาสและลูกลงห่วง (Devin Ross 8,150 รูป · เหมาะที่สุดเมื่อใช้ร่วมกับโหมดล็อกห่วง)', 'Detects balls and Made Basket events (Devin Ross · 8,150 images · Best with Lock Rim)'],
  'model.local-onnx-swish': ['Local ONNX: Swish-Vision (11.7 MB) Fine-tuned Basketball-1 ล็อกเฉพาะลูกบาสและห่วง ไม่ตีกรอบรวมกับคน (ออฟไลน์ 100%)', 'Local ONNX: Swish-Vision (11.7 MB) Fine-tuned Basketball-1; detects balls and rims separately from people (100% offline)'],
  'model.local-onnx-swish-int8': ['Local ONNX: Swish INT8 (3.3 MB) เวอร์ชันบีบอัด โหลดไว ประหยัดแรม (ออฟไลน์ 100%)', 'Local ONNX: Swish INT8 (3.3 MB) Compressed for faster loading and lower memory use (100% offline)'],
  'model.roboflow-custom': ['ใช้โมเดล Roboflow Universe ของคุณเอง (กรอก Model ID และ API Key ด้านล่าง)', 'Use your own Roboflow Universe model (enter Model ID and API Key below)'],
  labelRim: ['ห่วง', 'RIM'], labelLockedRim: ['ห่วง (ล็อก)', 'RIM (PINNED)'],
  labelBall: ['ลูกบาส', 'BALL'], labelMade: ['ลงห่วง', 'MADE'], labelPerson: ['ผู้เล่น', 'PERSON'],
  drawingRim: ['กำหนดห่วง...', 'Framing rim…'],
  setup: ['เตรียมพร้อม', 'Setup'], practice: ['กำลังฝึกซ้อม', 'Practice'], paused: ['พักการฝึกซ้อม', 'Paused'],
  ready: ['พร้อม', 'Ready'], notReady: ['ยังไม่พร้อม', 'Not ready'], opening: ['กำลังเปิด', 'Opening'], loadingShort: ['กำลังโหลด', 'Loading'],
  readiness: ['กล้อง: {camera} · โมเดล: {model} · ห่วง: {rim}', 'Camera: {camera} · Model: {model} · Rim: {rim}'],
  cameraRetry: ['กดเปิดกล้องเพื่อลองอีกครั้ง', 'Select Open Camera to try again.'],
  modelRetry: ['เปิดการตั้งค่าแล้วกดเปลี่ยนโมเดลเพื่อลองอีกครั้ง', 'Open Settings and select Change model to try again.'],
  cameraFailed: ['ไม่สามารถเปิดกล้องได้ ({detail})', 'Could not open the camera ({detail})'],
  cameraStopped: ['กล้องหยุดทำงาน กดเปิดกล้องอีกครั้ง', 'Camera stopped. Select Open Camera again.'],
  cameraUnsupported: ['เบราว์เซอร์นี้ไม่รองรับการเข้าถึงกล้อง (WebRTC / getUserMedia not supported)', 'This browser does not support camera access (WebRTC / getUserMedia not supported)'],
  cameraPermission: ['กรุณาอนุญาตการเข้าถึงกล้องในเบราว์เซอร์เพื่อใช้งานระบบนับคะแนน', 'Allow camera access in your browser to count shots.'],
  cameraNotFound: ['ไม่พบอุปกรณ์กล้องบนอุปกรณ์นี้', 'No camera was found on this device.'],
  cameraInUse: ['กล้องอาจถูกใช้งานโดยโปรแกรมอื่นอยู่ กรุณาปิดโปรแกรมอื่นแล้วลองใหม่', 'The camera may be in use. Close other apps and try again.'],
  cameraConstraints: ['อุปกรณ์ไม่รองรับความละเอียดกล้องที่ระบุ', 'The camera does not support the requested resolution.'],
  cameraSecurity: ['การเข้าถึงกล้องต้องใช้งานผ่าน HTTPS หรือ localhost เท่านั้น', 'Camera access requires HTTPS or localhost.'],
  loadingModel: ['กำลังโหลดโมเดล ({model})...', 'Loading model ({model})…'],
  missingModelId: ['กรุณากรอก Model ID (เช่น project-name/1)', 'Enter a Model ID (e.g. project-name/1).'],
  missingApiKey: ['กรุณากรอก Publishable API Key สำหรับ Custom Model', 'Enter a Publishable API Key for the custom model.'],
  loadingFallback: ['ไม่พบ Roboflow API Key — กำลังโหลด Local ONNX Model (Offline)...', 'No Roboflow API Key found — loading Local ONNX Model (Offline)…'],
  modelFallback: ['โหลดโมเดลหลักไม่สำเร็จ ({detail}) — สลับไปใช้ Local ONNX Model อัตโนมัติ', 'Primary model failed ({detail}) — automatically switched to Local ONNX Model.'],
  modelError: ['เกิดข้อผิดพลาดในการโหลดโมเดล: {detail}', 'Could not load model: {detail}'],
  processingSound: ['กำลังประมวลผลไฟล์เสียง...', 'Processing audio file…'],
  audioError: ['ไม่สามารถใช้ไฟล์เสียงได้: {detail}', 'Could not use audio file: {detail}'],
  noAudioFile: ['กรุณาเลือกไฟล์เสียง', 'Choose an audio file.'],
  audioTooLarge: ['ไฟล์ใหญ่เกินไป ({size} MB) ขนาดสูงสุดคือ 10 MB', 'File is too large ({size} MB). Maximum size is 10 MB.'],
  audioDecodeError: ['ไม่สามารถอ่านไฟล์เสียงได้: {detail}', 'Failed to decode audio file: {detail}'],
};

let language = 'th';
try {
  const saved = localStorage.getItem('hoop_language');
  if (saved === 'th' || saved === 'en') language = saved;
} catch { /* The current visit remains usable without browser storage. */ }

export function getLanguage() { return language; }

export function setLanguage(value) {
  if (value !== 'th' && value !== 'en') return;
  language = value;
  try { localStorage.setItem('hoop_language', value); } catch { /* Keep the in-memory choice. */ }
}

export function t(key, params = {}) {
  const template = messages[key]?.[language === 'en' ? 1 : 0] ?? key;
  return template.replace(/\{(\w+)\}/g, (token, name) => String(params[name] ?? token));
}

export function translateMessage(message) {
  return message && typeof message === 'object' ? t(message.key, message.params) : String(message ?? '');
}

export function userError(key, params = {}) {
  return Object.assign(new Error(t(key, params)), { userMessage: { key, params } });
}

export function translateDocument() {
  document.documentElement.lang = language;
  for (const [attribute, target] of [['data-i18n', null], ['data-i18n-title', 'title'], ['data-i18n-aria-label', 'aria-label'], ['data-i18n-placeholder', 'placeholder'], ['data-i18n-content', 'content']]) {
    for (const node of document.querySelectorAll(`[${attribute}]`)) {
      const value = t(node.getAttribute(attribute));
      if (target) node.setAttribute(target, value);
      else node.textContent = value;
    }
  }
}
