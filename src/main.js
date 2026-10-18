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
import { t, userError } from './i18n.js';

export class HoopCounterApp {
  constructor(services = {}) {
    // 1. Config initialization
    this.config = { ...DEFAULT_CONFIG };

    // 2. UI Controller
    this.ui = new UIController();
    this.videoElement = document.getElementById('camera-feed');

    // 3. Modules (Mediator Pattern — coordinated via this class)
    this.camera = services.camera || new CameraManager(this.videoElement, this.config);
    this.detector = services.detector || new ObjectDetector(this.config);
    this.tracker = new ShotTracker(this.config);
    this.sound = services.sound || new SoundManager(this.config);

    this.isRunning = false;
    this.isInferring = false;
    this.latestDetections = [];
    this.primaryRim = null;
    this.practiceState = 'setup';
    this.cameraReady = false;
    this.modelReady = false;
    this.cameraLoading = false;
    this.modelLoading = false;
    this.detectionEpoch = 0;
  }

  /**
   * Helper classification guards
   * @private
   */
  _isRim(d) {
    if (!d || !d.class) return false;
    const c = d.class.toLowerCase().trim();
    if (c.includes('ball') || c.includes('made')) return false;
    return c === '1' || c.includes('rim') || c.includes('hoop') || c.includes('backboard') || c === 'basket';
  }

  _isBall(d) {
    if (!d || !d.class) return false;
    const c = d.class.toLowerCase().trim();
    return c === '2' || c.includes('ball');
  }

  _isMade(d) {
    if (!d || !d.class) return false;
    return d.class.toLowerCase().includes('made');
  }

  /**
   * Filter and normalize raw detections into single primary rim & tracking list
   * @private
   */
  _processDetections(rawDetections) {
    const timestamp = performance.now();
    const manualRim = this.ui.getManualRimRoi();
    const detections = rawDetections || [];
    const filtered = [];
    let rim = manualRim;
    let bestAutoRim = null;

    for (let i = 0; i < detections.length; i++) {
      const d = detections[i];
      if (this._isRim(d)) {
        if (!manualRim && (!bestAutoRim || (d.confidence || 0) > (bestAutoRim.confidence || 0))) {
          bestAutoRim = d;
        }
      } else {
        filtered.push({ ...d, _timestamp: timestamp });
      }
    }

    if (!manualRim && bestAutoRim) {
      rim = bestAutoRim;
      filtered.push({ ...bestAutoRim, _timestamp: timestamp });
    }

    this.latestDetections = filtered;
    this.primaryRim = rim;
    this._updatePracticeControls();
  }

  /**
   * Main Application Frame Loop (requestAnimationFrame)
   * Adheres to ARCHITECTURE.md Section 2.1 — True Decoupled 60 FPS Render Loop
   */
  mainLoop() {
    if (!this.isRunning) return;

    if (this.videoElement && this.videoElement.readyState >= 2) {
      // 1. Asynchronous Non-Blocking Inference Trigger (Runs in background without pausing UI)
      if (!this.isInferring && this.cameraReady && this.modelReady && !this.ui.isDrawingRim) {
        this.isInferring = true;
        const epoch = this.detectionEpoch;
        const cropRoi = this.ui.isHoopRoiEnabled() ? this.ui.getManualRimRoi() : null;
        this.detector
          .detect(this.videoElement, cropRoi)
          .then((rawDetections) => {
            if (epoch === this.detectionEpoch) this._processDetections(rawDetections);
            this.isInferring = false;
          })
          .catch((err) => {
            console.warn('[MainLoop] Inference warning:', err);
            this.isInferring = false;
          });
      }

      // 2. Unblocked 60 FPS Render & HUD Update Loop (Never pauses, 60 FPS Interpolator runs continuously)
      this.ui.drawDetections(this.latestDetections);

      // 3. Continuous shot tracking (Zero-allocation 60 FPS duck-typing)
      const ball = this.ui.getBallInterpolatedBox() || this.latestDetections.find((d) => this._isBall(d));
      const madeBasket = this.latestDetections.find((d) => this._isMade(d));

      // 4. Update shot tracker state machine with continuous trajectory
      const scored = this.practiceState === 'practice' && this.cameraReady && this.modelReady
        && this.tracker.update(this.primaryRim, ball, madeBasket);

      // 5. Handle score event
      if (scored) {
        console.log('🎯 SCORE EVENT TRIGGERED!');
        this.sound.playScoreSound();
        this.ui.incrementScore();
      }
    }

    requestAnimationFrame(() => this.mainLoop());
  }

  /**
   * Application Initialization Sequence
   */
  async init() {
    console.log('🏀 Initializing Hoop Shot Counter App...');

    this.camera.onError(({ type, message, originalError }) => {
      if (this.ui.isDrawingRim) this.ui.stopDrawingRim();
      this.cameraReady = false;
      const keys = { UNSUPPORTED: 'cameraUnsupported', PERMISSION_DENIED: 'cameraPermission', DEVICE_NOT_FOUND: 'cameraNotFound', CAMERA_IN_USE: 'cameraInUse', OVERCONSTRAINED: 'cameraConstraints', SECURITY_ERROR: 'cameraSecurity' };
      this.cameraError = { key: keys[type] || 'cameraFailed', params: { detail: originalError?.message || message } };
      this.pausePractice();
    });

    // Wire UI Events (Mediator Pattern)
    this._wireEvents();

    this._updatePracticeControls();
    this.isRunning = true;
    requestAnimationFrame(() => this.mainLoop());
  }

  _updatePracticeControls() {
    const rim = this.ui.getManualRimRoi() || this.primaryRim;
    const box = rim?.bbox || rim;
    const rimReady = !this.ui.isDrawingRim && !!box
      && [box.x, box.y, box.width, box.height].every(Number.isFinite)
      && box.width > 0 && box.height > 0;
    this.canPractice = this.cameraReady && this.modelReady && rimReady;
    this.ui.updatePracticeControls({
      state: this.practiceState, cameraReady: this.cameraReady, modelReady: this.modelReady,
      rimReady, canPractice: this.canPractice, cameraLoading: this.cameraLoading,
      modelLoading: this.modelLoading, cameraError: this.cameraError, modelError: this.modelError,
    });
  }

  _clearTracking() {
    this.detectionEpoch++;
    this.latestDetections = [];
    this.ui.clearDetections();
    this.detector.clearDetections();
    this.tracker.clearTrajectory();
  }

  pausePractice() {
    if (this.practiceState === 'practice') this.practiceState = 'paused';
    this._clearTracking();
    this._updatePracticeControls();
  }

  togglePractice() {
    if (this.practiceState === 'practice') return this.pausePractice();
    this._updatePracticeControls();
    if (!this.canPractice) return;
    this._clearTracking();
    this.practiceState = 'practice';
    this._updatePracticeControls();
  }

  _initSound() {
    if (!this.soundInitialization) {
      this.soundInitialization = this.sound.init().catch(soundErr => {
        console.warn('🔊 Sound initialization warning:', soundErr);
        this.soundInitialization = null;
      });
    }
    return this.soundInitialization;
  }

  async openCamera(deviceId = null) {
    if (this.cameraLoading) return;
    if (this.ui.isDrawingRim) this.ui.stopDrawingRim();
    this.pausePractice();
    this.cameraReady = false;
    this.cameraLoading = true;
    this.cameraError = null;
    this.primaryRim = null;
    this._updatePracticeControls();
    // Audio loading must not delay camera access or overwrite the player's choices.
    this._initSound();

    // Start Camera Stream
    try {
      const stream = deviceId ? await this.camera.switchCamera(deviceId) : await this.camera.start();
      if (!stream) throw Object.assign(new Error('Camera start failed'), { userMessage: this.cameraError || { key: 'cameraFailed', params: { detail: 'No stream' } } });
      this.ui.initCanvas(this.videoElement);
      this.cameraReady = true;
      for (const track of stream.getVideoTracks()) {
        track.addEventListener('ended', () => {
          if (stream !== this.camera.currentStream) return;
          if (this.ui.isDrawingRim) this.ui.stopDrawingRim();
          this.cameraReady = false;
          this.primaryRim = null;
          this.cameraError = { key: 'cameraStopped' };
          this.pausePractice();
        });
      }
      const devices = await this.camera.listDevices();
      this.ui.populateCameraList(devices, this.camera.currentDeviceId);
    } catch (camErr) {
      this.cameraReady = false;
      this.cameraError = camErr.userMessage || { key: 'cameraFailed', params: { detail: camErr.message } };
    } finally {
      this.cameraLoading = false;
      this._updatePracticeControls();
    }

    // Load initial detection model (from localStorage or default config)
    if (this.cameraReady && !this.modelReady) await this.loadActiveModel(this.ui.getModelSettings());
  }

  /**
   * Load or switch active detection model
   * @param {{modelType: string, customModelId?: string, customApiKey?: string}} settings
   */
  async loadActiveModel(settings) {
    if (this.modelLoading) return;
    this.pausePractice();
    this.modelReady = false;
    this.modelLoading = true;
    this.modelError = null;
    this.primaryRim = null;
    this._updatePracticeControls();
    const { modelType, customModelId, customApiKey } = settings;
    const preset = Object.hasOwn(MODEL_PRESETS, modelType) ? MODEL_PRESETS[modelType] : MODEL_PRESETS[DEFAULT_CONFIG.modelType];

    // Clear old visual bounding boxes immediately
    this.ui.clearDetections();

    try {
      this.ui.showLoading({ key: 'loadingModel', params: { model: (preset.name || modelType).split('(')[0].trim() } });

      let loadOptions = {};

      if (preset.provider === 'onnx') {
        loadOptions = {
          provider: 'onnx',
          modelPath: preset.modelPath || this.config.onnxModelPath,
        };
      } else if (modelType === 'roboflow-custom') {
        const apiKey = customApiKey || this.config.publishableKey;
        if (!customModelId) {
          throw userError('missingModelId');
        }
        if (!apiKey || apiKey === 'rf_live_placeholder') {
          throw userError('missingApiKey');
        }
        loadOptions = {
          provider: 'roboflow',
          modelId: customModelId,
          apiKey: apiKey,
          autoFallback: true,
        };
      }

      const result = await this.detector.loadModel(loadOptions);
      this.modelReady = true;

      if (result && result.fallback) {
        console.warn('⚠️ Switched to Local ONNX Model due to Roboflow error:', result.originalError);
        this.ui.setActiveModelUI('local-onnx-swish');
        this.ui.showError({ key: 'modelFallback', params: { detail: result.originalError } });
      } else {
        this.ui.hideLoading();
      }
    } catch (err) {
      console.error('🤖 Model load error:', err);
      this.modelError = err.userMessage || { key: 'modelError', params: { detail: err.message } };
      this.ui.showError(this.modelError);
    } finally {
      this.modelLoading = false;
      this._updatePracticeControls();
    }
  }

  /**
   * Wire UI and Module events
   * @private
   */
  _wireEvents() {
    this.ui.bindPractice(() => this.togglePractice());
    this.ui.bindOpenCamera(() => this.openCamera());
    this.ui.bindRimChange(() => {
      this.pausePractice();
      this.primaryRim = null;
      this._updatePracticeControls();
    });
    // Reset Score
    this.ui.bindReset(() => {
      if (!window.confirm(t('resetConfirm'))) return;
      this._clearTracking();
      this.tracker.reset();
      this.ui.resetScore();
    });

    // Camera Switch
    this.ui.bindCameraChange(async (deviceId) => {
      if (deviceId) {
        await this.openCamera(deviceId);
      }
    });

    // Sound Selection & Custom Upload
    this.ui.bindSoundChange(async (soundId, customFile) => {
      await this._initSound();
      if (soundId === 'custom' && customFile) {
        try {
          this.ui.showLoading({ key: 'processingSound' });
          await this.sound.loadCustomSound(customFile);
          this.ui.hideLoading();
          this.sound.playScoreSound();
        } catch (err) {
          this.ui.showError(err.userMessage || { key: 'audioError', params: { detail: err.message } });
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
    this.ui.bindTestSound(async () => {
      await this._initSound();
      console.log('🔊 Test sound button clicked');
      this.sound.playScoreSound();
    });

    // Model Change / Switch Button
    this.ui.bindModelChange(async (settings) => {
      console.log('🤖 Model change requested:', settings);
      await this.loadActiveModel(settings);
    });
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
