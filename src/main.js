/**
 * @fileoverview Main Application Controller & Mediator
 * Coordinates Camera, Object Detector, Shot Tracker, Sound Manager, and UI Controller.
 * Adheres to ARCHITECTURE.md Section 2.1, 1.2, and 4.
 */

import { DEFAULT_CONFIG, MODEL_PRESETS } from './config.js';
import { CameraManager } from './camera.js';
import { ObjectDetector } from './detector.js';
import { ShotTracker } from './shot-tracker.js';
import { SoundManager } from './sound-manager.js';
import { UIController } from './ui.js';

export class HoopCounterApp {
  constructor() {
    // 1. Config initialization
    this.config = { ...DEFAULT_CONFIG };

    // 2. UI Controller
    this.ui = new UIController();
    this.videoElement = document.getElementById('camera-feed');

    // 3. Modules (Mediator Pattern — coordinated via this class)
    this.camera = new CameraManager(this.videoElement, this.config);
    this.detector = new ObjectDetector(this.config);
    this.tracker = new ShotTracker(this.config);
    this.sound = new SoundManager(this.config);

    this.isRunning = false;
    this.isProcessingFrame = false;
  }

  /**
   * Application Initialization Sequence
   */
  async init() {
    console.log('🏀 Initializing Hoop Shot Counter App...');
    this.ui.showLoading('กำลังเริ่มต้นระบบ...');

    // Setup Camera Callbacks
    this.camera.onReady(async ({ video }) => {
      console.log('📷 Camera ready event received');
      this.ui.initCanvas(video);
      const devices = await this.camera.listDevices();
      this.ui.populateCameraList(devices, this.camera.currentDeviceId);
    });

    this.camera.onError(({ message }) => {
      console.error('📷 Camera Error:', message);
      this.ui.showError(message);
    });

    // Wire UI Events (Mediator Pattern)
    this._wireEvents();

    // Initialize Sound System
    try {
      await this.sound.init();
      this.sound.setVolume(this.config.volume);
      this.sound.setActiveSound(this.config.defaultSound);
    } catch (soundErr) {
      console.warn('🔊 Sound initialization warning:', soundErr);
    }

    // Start Camera Stream
    try {
      await this.camera.start();
    } catch (camErr) {
      console.error('📷 Failed to start camera:', camErr);
    }

    // Load initial detection model (from localStorage or default config)
    const initialModelSettings = this.ui.getModelSettings();
    await this.loadActiveModel(initialModelSettings);

    // Start Main Loop
    this.isRunning = true;
    requestAnimationFrame(() => this.mainLoop());
    console.log('🏀 Main application loop started.');
  }

  /**
   * Load or switch active detection model
   * @param {{modelType: string, customModelId?: string, customApiKey?: string}} settings
   */
  async loadActiveModel(settings) {
    const { modelType, customModelId, customApiKey } = settings;
    const preset = MODEL_PRESETS[modelType] || MODEL_PRESETS['roboflow-default'];

    try {
      this.ui.showLoading(`กำลังโหลดโมเดล (${preset.name || modelType})...`);

      let loadOptions = {};

      if (preset.provider === 'onnx') {
        loadOptions = {
          provider: 'onnx',
          modelPath: preset.modelPath || this.config.onnxModelPath,
        };
      } else if (modelType === 'roboflow-custom') {
        const apiKey = customApiKey || this.config.publishableKey;
        if (!customModelId) {
          throw new Error('กรุณากรอก Model ID (เช่น project-name/1)');
        }
        if (!apiKey || apiKey === 'rf_live_placeholder') {
          throw new Error('กรุณากรอก Publishable API Key สำหรับ Custom Model');
        }
        loadOptions = {
          provider: 'roboflow',
          modelId: customModelId,
          apiKey: apiKey,
          autoFallback: true,
        };
      } else {
        // Roboflow presets (default or v3)
        const apiKey = customApiKey || this.config.publishableKey;
        if (!apiKey || apiKey === 'rf_live_placeholder') {
          console.warn('⚠️ No Roboflow API Key found. Switching to Local ONNX Fallback...');
          this.ui.showLoading('ไม่พบ Roboflow API Key — กำลังโหลด Local ONNX Model (Offline)...');
          loadOptions = {
            provider: 'onnx',
            modelPath: this.config.onnxModelPath,
          };
          this.ui.setActiveModelUI('local-onnx-swish');
        } else {
          loadOptions = {
            provider: 'roboflow',
            modelId: preset.modelId,
            apiKey: apiKey,
            autoFallback: true,
          };
        }
      }

      const result = await this.detector.loadModel(loadOptions);

      if (result && result.fallback) {
        console.warn('⚠️ Switched to Local ONNX Model due to Roboflow error:', result.originalError);
        this.ui.setActiveModelUI('local-onnx-swish');
        this.ui.showError(`โหลดโมเดลหลักไม่สำเร็จ (${result.originalError}) → สลับไปใช้ Local ONNX Model อัตโนมัติ`);
        setTimeout(() => this.ui.hideLoading(), 2500);
      } else {
        this.ui.hideLoading();
      }
    } catch (err) {
      console.error('🤖 Model load error:', err);
      this.ui.showError(`เกิดข้อผิดพลาดในการโหลดโมเดล: ${err.message}`);
    }
  }

  /**
   * Wire UI and Module events
   * @private
   */
  _wireEvents() {
    // Reset Score
    this.ui.bindReset(() => {
      this.tracker.reset();
      this.ui.resetScore();
    });

    // Camera Switch
    this.ui.bindCameraChange(async (deviceId) => {
      if (deviceId) {
        this.ui.showLoading('กำลังสลับกล้อง...');
        await this.camera.switchCamera(deviceId);
        this.ui.initCanvas(this.videoElement);
        this.ui.hideLoading();
      }
    });

    // Sound Selection & Custom Upload
    this.ui.bindSoundChange(async (soundId, customFile) => {
      if (soundId === 'custom' && customFile) {
        try {
          this.ui.showLoading('กำลังประมวลผลไฟล์เสียง...');
          await this.sound.loadCustomSound(customFile);
          this.ui.hideLoading();
          this.sound.playScoreSound();
        } catch (err) {
          this.ui.showError(err.message);
        }
      } else if (soundId) {
        this.sound.setActiveSound(soundId);
        this.sound.playScoreSound(); // Play preview sound so user can hear it
      }
    });

    // Volume Slider
    this.ui.bindVolumeChange((level) => {
      this.sound.setVolume(level);
    });

    // Sensitivity / Confidence Slider
    this.ui.bindSensitivityChange((threshold) => {
      this.detector.setConfidence(threshold);
    });

    // Test Sound Button
    this.ui.bindTestSound(() => {
      console.log('🔊 Test sound button clicked');
      this.sound.playScoreSound();
    });

    // Model Change / Switch Button
    this.ui.bindModelChange(async (settings) => {
      console.log('🤖 Model change requested:', settings);
      await this.loadActiveModel(settings);
    });
  }

  /**
   * Main Application Frame Loop (requestAnimationFrame)
   * Adheres to ARCHITECTURE.md Section 2.1
   */
  async mainLoop() {
    if (!this.isRunning) return;

    if (this.videoElement && this.videoElement.readyState >= 2 && !this.isProcessingFrame) {
      this.isProcessingFrame = true;

      try {
        // 1. Run detection (throttled inside detector)
        const detections = await this.detector.detect(this.videoElement);

        // 2. Draw bounding boxes on canvas
        this.ui.drawDetections(detections);

        // 3. Extract rim & ball detections
        const rim = detections.find((d) => d.class && (d.class.includes('rim') || d.class.includes('hoop') || d.class.includes('basket')));
        const ball = detections.find((d) => d.class && d.class.includes('ball'));

        // 4. Update shot tracker state machine
        const scored = this.tracker.update(rim, ball);

        // 5. Handle score event (Event Flow Section 4)
        if (scored) {
          console.log('🎯 SCORE EVENT TRIGGERED!');
          this.sound.playScoreSound();
          this.ui.incrementScore();
        }
      } catch (frameError) {
        console.warn('[MainLoop] Frame processing warning:', frameError);
      } finally {
        this.isProcessingFrame = false;
      }
    }

    requestAnimationFrame(() => this.mainLoop());
  }
}

// Bootstrap Application on DOM Ready
window.addEventListener('DOMContentLoaded', () => {
  const app = new HoopCounterApp();
  app.init();

  window.addEventListener('beforeunload', () => {
    try {
      if (app.detector && app.detector.onnxDetector) {
        app.detector.onnxDetector.dispose();
      }
    } catch (_) {}
  });
});
