/**
 * @fileoverview UI Controller & Canvas Overlay Manager
 * Handles UI interactions, settings drawer, animations, and canvas detection rendering.
 */

export class UIController {
  constructor() {
    this.video = document.getElementById('camera-feed');
    this.canvas = document.getElementById('detection-overlay');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    this.scoreElement = document.getElementById('score-value');
    this.statusIndicator = document.getElementById('status-indicator');
    this.statusSpinner = document.getElementById('status-spinner');
    this.statusText = document.getElementById('status-text');

    this.settingsPanel = document.getElementById('settings-panel');
    this.btnSettingsToggle = document.getElementById('btn-settings-toggle');
    this.btnCloseSettings = document.getElementById('btn-close-settings');

    this.cameraSelect = document.getElementById('camera-select');
    this.btnReset = document.getElementById('btn-reset-score');

    this.soundRadios = document.querySelectorAll('input[name="sound-choice"]');
    this.customSoundContainer = document.getElementById('custom-sound-upload-container');
    this.customSoundFile = document.getElementById('custom-sound-file');

    this.volumeSlider = document.getElementById('volume-slider');
    this.volumeLabel = document.getElementById('volume-label');
    this.confidenceSlider = document.getElementById('confidence-slider');
    this.confidenceLabel = document.getElementById('confidence-label');

    this.btnFullscreen = document.getElementById('btn-fullscreen-toggle');

    // Model selection controls
    this.modelSelect = document.getElementById('model-preset-select');
    this.modelInfoText = document.getElementById('model-info-text');
    this.customModelFields = document.getElementById('custom-model-fields');
    this.customModelIdInput = document.getElementById('custom-model-id');
    this.customApiKeyInput = document.getElementById('custom-api-key');
    this.btnApplyModel = document.getElementById('btn-apply-model');

    // Model Guide Modal controls
    this.modalGuide = document.getElementById('model-guide-modal');
    this.btnOpenModelGuide = document.getElementById('btn-open-model-guide');
    this.btnCloseModelGuide = document.getElementById('btn-close-model-guide');
    this.btnCloseModalFooter = document.getElementById('btn-close-modal-footer');

    // Manual Rim ROI Controls
    this.btnPinRim = document.getElementById('btn-pin-rim');
    this.btnClearRim = document.getElementById('btn-clear-rim');
    this.btnSettingsPinRim = document.getElementById('btn-settings-pin-rim');
    this.btnSettingsClearRim = document.getElementById('btn-settings-clear-rim');
    this.rimStatusBox = document.getElementById('rim-status-box');
    this.rimStatusText = document.getElementById('rim-status-text');
    this.rimDrawBanner = document.getElementById('rim-draw-banner');
    this.btnCancelDrawRim = document.getElementById('btn-cancel-draw-rim');

    this.isDrawingRim = false;
    this.dragStart = null;
    this.currentDragBox = null;
    this.manualRimRoi = null;

    this.currentScore = 0;

    this._loadManualRimRoi();
    this._setupInternalEventListeners();
    this._setupManualRimEvents();
    this._loadSavedModelSettings();
  }

  /**
   * Load saved manual rim ROI from localStorage
   * @private
   */
  _loadManualRimRoi() {
    try {
      const saved = localStorage.getItem('hoop_manual_rim_roi');
      if (saved) {
        this.manualRimRoi = JSON.parse(saved);
        this._updateManualRimUI();
      }
    } catch (err) {
      console.warn('[UIController] Could not load saved manual rim ROI:', err);
    }
  }

  /**
   * Setup interactive canvas touch/mouse drawing listeners for Manual Rim Box
   * @private
   */
  _setupManualRimEvents() {
    if (this.btnPinRim) {
      this.btnPinRim.addEventListener('click', () => this.toggleDrawingRim());
    }
    if (this.btnSettingsPinRim) {
      this.btnSettingsPinRim.addEventListener('click', () => {
        this.hideSettings();
        this.startDrawingRim();
      });
    }
    if (this.btnClearRim) {
      this.btnClearRim.addEventListener('click', () => this.clearManualRimRoi());
    }
    if (this.btnSettingsClearRim) {
      this.btnSettingsClearRim.addEventListener('click', () => this.clearManualRimRoi());
    }
    if (this.btnCancelDrawRim) {
      this.btnCancelDrawRim.addEventListener('click', () => this.stopDrawingRim());
    }

    if (!this.canvas) return;

    const getCanvasPoint = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : (e.clientX ?? 0);
      const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : (e.clientY ?? 0);

      // Account for aspect-ratio preservation (object-fit: contain)
      const canvasAspect = (this.canvas.width || 640) / (this.canvas.height || 480);
      const rectAspect = rect.width / (rect.height || 1);

      let renderWidth = rect.width;
      let renderHeight = rect.height;
      let renderLeft = rect.left;
      let renderTop = rect.top;

      if (rectAspect > canvasAspect) {
        // Pillarbox (black bars on left/right)
        renderWidth = rect.height * canvasAspect;
        renderLeft = rect.left + (rect.width - renderWidth) / 2;
      } else {
        // Letterbox (black bars on top/bottom)
        renderHeight = rect.width / canvasAspect;
        renderTop = rect.top + (rect.height - renderHeight) / 2;
      }

      const scaleX = (this.canvas.width || 640) / (renderWidth || 1);
      const scaleY = (this.canvas.height || 480) / (renderHeight || 1);

      const x = Math.max(0, Math.min(this.canvas.width || 640, (clientX - renderLeft) * scaleX));
      const y = Math.max(0, Math.min(this.canvas.height || 480, (clientY - renderTop) * scaleY));

      return { x: Math.round(x), y: Math.round(y) };
    };

    // Touch & Pointer start
    const handleStart = (e) => {
      if (!this.isDrawingRim) return;
      e.preventDefault();
      e.stopPropagation();
      const pt = getCanvasPoint(e);
      this.dragStart = pt;
      this.currentDragBox = { x: pt.x, y: pt.y, width: 0, height: 0 };
    };

    // Touch & Pointer move
    const handleMove = (e) => {
      if (!this.isDrawingRim || !this.dragStart) return;
      e.preventDefault();
      e.stopPropagation();
      const pt = getCanvasPoint(e);
      const minX = Math.min(this.dragStart.x, pt.x);
      const minY = Math.min(this.dragStart.y, pt.y);
      const width = Math.abs(pt.x - this.dragStart.x);
      const height = Math.abs(pt.y - this.dragStart.y);

      this.currentDragBox = {
        x: Math.round(minX),
        y: Math.round(minY),
        width: Math.round(width),
        height: Math.round(height),
      };
    };

    // Touch & Pointer end
    const handleEnd = (e) => {
      if (!this.isDrawingRim || !this.dragStart || !this.currentDragBox) return;
      e.preventDefault();

      // Only accept if drawn box is meaningful size (> 15px)
      if (this.currentDragBox.width >= 15 && this.currentDragBox.height >= 15) {
        this.setManualRimRoi(this.currentDragBox);
      }
      this.stopDrawingRim();
    };

    // Pointer Events (Unified Touch + Mouse for modern browsers)
    this.canvas.addEventListener('pointerdown', handleStart);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd);
    window.addEventListener('pointercancel', handleEnd);

    // Fallback Touch Events for older mobile WebViews
    this.canvas.addEventListener('touchstart', handleStart, { passive: false });
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd, { passive: false });
  }

  /**
   * Toggle drawing mode on/off
   */
  toggleDrawingRim() {
    if (this.isDrawingRim) {
      this.stopDrawingRim();
    } else {
      this.startDrawingRim();
    }
  }

  /**
   * Start manual rim drawing mode
   */
  startDrawingRim() {
    this.isDrawingRim = true;
    this.dragStart = null;
    this.currentDragBox = null;
    this.clearDetections();
    document.body.classList.add('drawing-active');
    if (this.rimDrawBanner) this.rimDrawBanner.classList.remove('hidden');
    if (this.btnPinRim) this.btnPinRim.classList.add('btn-pin-active');
    if (this.canvas) this.canvas.classList.add('canvas-drawing-mode');
  }

  /**
   * Stop manual rim drawing mode
   */
  stopDrawingRim() {
    this.isDrawingRim = false;
    this.dragStart = null;
    this.currentDragBox = null;
    document.body.classList.remove('drawing-active');
    if (this.rimDrawBanner) this.rimDrawBanner.classList.add('hidden');
    if (this.btnPinRim) this.btnPinRim.classList.remove('btn-pin-active');
    if (this.canvas) this.canvas.classList.remove('canvas-drawing-mode');
  }

  /**
   * Set and persist manual rim ROI
   * @param {Object} roi { x, y, width, height }
   */
  setManualRimRoi(roi) {
    if (!roi) return;
    this.manualRimRoi = {
      x: Math.round(roi.x),
      y: Math.round(roi.y),
      width: Math.round(roi.width),
      height: Math.round(roi.height),
    };
    try {
      localStorage.setItem('hoop_manual_rim_roi', JSON.stringify(this.manualRimRoi));
    } catch (err) {
      console.warn('[UIController] Could not save manual rim to localStorage:', err);
    }
    this._updateManualRimUI();
  }

  /**
   * Clear manual rim ROI and return to Auto AI mode
   */
  clearManualRimRoi() {
    this.manualRimRoi = null;
    this.stopDrawingRim();
    this.clearDetections();
    try {
      localStorage.removeItem('hoop_manual_rim_roi');
    } catch (err) {
      console.warn('[UIController] Could not clear manual rim from localStorage:', err);
    }
    this._updateManualRimUI();
  }

  /**
   * Get active manual rim ROI detection object
   * @returns {Object|null}
   */
  getManualRimRoi() {
    if (!this.manualRimRoi) return null;
    return {
      bbox: { ...this.manualRimRoi },
      class: 'rim',
      confidence: 1.0,
      isManual: true,
    };
  }

  /**
   * Update visual labels and buttons for Manual Rim state
   * @private
   */
  _updateManualRimUI() {
    const isPinned = !!this.manualRimRoi;
    if (this.btnClearRim) {
      this.btnClearRim.classList.toggle('hidden', !isPinned);
    }
    if (this.btnSettingsClearRim) {
      this.btnSettingsClearRim.classList.toggle('hidden', !isPinned);
    }
    if (this.btnPinRim) {
      this.btnPinRim.textContent = isPinned ? '🎯 แก้ไขห่วง' : '🎯 ล็อกห่วง';
      this.btnPinRim.title = isPinned ? 'แต้มพิกัดห่วงบาสถูกล็อกอยู่ (คลิกเพื่อวาดใหม่)' : 'กำหนดพิกัดห่วงบาสเอง';
    }
    if (this.rimStatusBox) {
      this.rimStatusBox.classList.toggle('pinned', isPinned);
    }
    if (this.rimStatusText) {
      this.rimStatusText.innerHTML = isPinned
        ? 'โหมด: <strong>📌 ล็อกตำแหน่งห่วง (Manual)</strong>'
        : 'โหมด: <strong>🤖 Auto (AI ค้นหาห่วง)</strong>';
    }
  }

  /**
   * Internal listeners for UI state toggles
   * @private
   */
  _setupInternalEventListeners() {
    if (this.btnFullscreen) {
      this.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());

      const updateFullscreenIcon = () => {
        const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
        this.btnFullscreen.textContent = isFull ? '🗗' : '⛶';
        this.btnFullscreen.title = isFull ? 'ออกจากโหมดเต็มจอ' : 'เต็มจอ (Fullscreen)';

        const appEl = document.getElementById('app');
        if (appEl) {
          appEl.classList.toggle('is-fullscreen', isFull);
        }
        document.body.classList.toggle('is-fullscreen', isFull);
      };

      document.addEventListener('fullscreenchange', updateFullscreenIcon);
      document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
    }

    if (this.btnSettingsToggle) {
      this.btnSettingsToggle.addEventListener('click', () => this.showSettings());
    }

    if (this.btnCloseSettings) {
      this.btnCloseSettings.addEventListener('click', () => this.hideSettings());
    }

    // Model Guide Modal Events
    if (this.btnOpenModelGuide) {
      this.btnOpenModelGuide.addEventListener('click', () => this.showModelGuide());
    }
    if (this.btnCloseModelGuide) {
      this.btnCloseModelGuide.addEventListener('click', () => this.hideModelGuide());
    }
    if (this.btnCloseModalFooter) {
      this.btnCloseModalFooter.addEventListener('click', () => this.hideModelGuide());
    }
    if (this.modalGuide) {
      this.modalGuide.addEventListener('click', (e) => {
        if (e.target === this.modalGuide) {
          this.hideModelGuide();
        }
      });
    }

    // Auto-sync canvas when video stream metadata arrives or device orientation changes
    if (this.video) {
      this.video.addEventListener('loadedmetadata', () => this.initCanvas(this.video));
      this.video.addEventListener('play', () => this.initCanvas(this.video));
    }
    window.addEventListener('resize', () => this.initCanvas(this.video));
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.initCanvas(this.video), 200);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideModelGuide();
      }
    });

    if (this.soundRadios) {
      this.soundRadios.forEach((radio) => {
        radio.addEventListener('change', (e) => {
          if (this.customSoundContainer) {
            if (e.target.value === 'custom') {
              this.customSoundContainer.classList.remove('hidden');
            } else {
              this.customSoundContainer.classList.add('hidden');
            }
          }
        });
      });
    }

    if (this.volumeSlider && this.volumeLabel) {
      this.volumeSlider.addEventListener('input', (e) => {
        this.volumeLabel.textContent = `${e.target.value}%`;
      });
    }

    if (this.confidenceSlider && this.confidenceLabel) {
      this.confidenceSlider.addEventListener('input', (e) => {
        this.confidenceLabel.textContent = `${e.target.value}%`;
      });
    }

    // Model selection change
    if (this.modelSelect) {
      this.modelSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        this._updateModelDescriptions(val);
        this._saveModelSettings();
      });
    }

    // Auto-save custom model inputs
    if (this.customModelIdInput) {
      this.customModelIdInput.addEventListener('input', () => this._saveModelSettings());
    }
    if (this.customApiKeyInput) {
      this.customApiKeyInput.addEventListener('input', () => this._saveModelSettings());
    }
  }

  /**
   * Show Model Guide Modal
   */
  showModelGuide() {
    if (this.modalGuide) {
      this.modalGuide.classList.remove('hidden');
    }
  }

  /**
   * Hide Model Guide Modal
   */
  hideModelGuide() {
    if (this.modalGuide) {
      this.modalGuide.classList.add('hidden');
    }
  }

  /**
   * Update model description text and custom input visibility
   * @private
   */
  _updateModelDescriptions(modelType) {
    if (this.customModelFields) {
      if (modelType === 'roboflow-custom') {
        this.customModelFields.classList.remove('hidden');
      } else {
        this.customModelFields.classList.add('hidden');
      }
    }

    if (this.modelInfoText) {
      const descriptions = {
        'roboflow-default': 'ตรวจจับห่วง ลูกบาส และผู้เล่น (Roboflow Universe v4 · โมเดลหลัก Cloud ความเสถียรสูงสุด)',
        'roboflow-cricket': 'โมเดลชุดใหญ่ 9,500+ รูป (cricket-qnb5l/basketball-xil7x/1 · ตรวจจับ ball, person, rim)',
        'roboflow-devinross': 'ตรวจจับลูกบาสและลูกลงห่วง (Devin Ross 8,150 รูป · เหมาะที่สุดเมื่อใช้ร่วมกับโหมดล็อกห่วง)',
        'local-onnx-swish': '⚡ Local ONNX: Swish-Vision (11.7 MB) Fine-tuned Basketball-1 ล็อกเฉพาะลูกบาสและห่วง ไม่ตีกรอบรวมกับคน (ออฟไลน์ 100%)',
        'roboflow-custom': 'ใช้โมเดล Roboflow Universe ของคุณเอง (กรอก Model ID และ API Key ด้านล่าง)',
      };
      this.modelInfoText.textContent = descriptions[modelType] || 'เลือกโมเดลตรวจจับ AI';
      this.modelInfoText.classList.toggle('highlight', modelType && modelType.startsWith('local-onnx'));
    }
  }

  /**
   * Load saved model configuration from localStorage
   * @private
   */
  _loadSavedModelSettings() {
    try {
      let savedType = localStorage.getItem('hoop_selected_model_type');
      const savedModelId = localStorage.getItem('hoop_custom_model_id');
      const savedApiKey = localStorage.getItem('hoop_custom_api_key');

      // If localStorage had a removed/stale model type, fallback to roboflow-default
      const validTypes = [
        'roboflow-default',
        'roboflow-cricket',
        'roboflow-devinross',
        'local-onnx-swish',
        'roboflow-custom',
      ];
      if (!savedType || !validTypes.includes(savedType)) {
        savedType = 'roboflow-default';
        localStorage.setItem('hoop_selected_model_type', savedType);
      }

      if (this.modelSelect) {
        this.modelSelect.value = savedType;
        this._updateModelDescriptions(savedType);
      }

      if (savedModelId && this.customModelIdInput) {
        this.customModelIdInput.value = savedModelId;
      }

      if (savedApiKey && this.customApiKeyInput) {
        this.customApiKeyInput.value = savedApiKey;
      }
    } catch (err) {
      console.warn('[UIController] Could not read settings from localStorage:', err);
    }
  }

  /**
   * Save model configuration to localStorage
   * @private
   */
  _saveModelSettings() {
    try {
      if (this.modelSelect) {
        localStorage.setItem('hoop_selected_model_type', this.modelSelect.value);
      }
      if (this.customModelIdInput) {
        localStorage.setItem('hoop_custom_model_id', this.customModelIdInput.value.trim());
      }
      if (this.customApiKeyInput) {
        localStorage.setItem('hoop_custom_api_key', this.customApiKeyInput.value.trim());
      }
    } catch (err) {
      console.warn('[UIController] Could not write settings to localStorage:', err);
    }
  }

  /**
   * Get currently configured model parameters
   * @returns {{modelType: string, customModelId: string, customApiKey: string}}
   */
  getModelSettings() {
    return {
      modelType: this.modelSelect ? this.modelSelect.value : 'roboflow-default',
      customModelId: this.customModelIdInput ? this.customModelIdInput.value.trim() : '',
      customApiKey: this.customApiKeyInput ? this.customApiKeyInput.value.trim() : '',
    };
  }

  /**
   * Update active model UI selection programmatically (e.g. on auto-fallback)
   * @param {string} modelType
   */
  setActiveModelUI(modelType) {
    if (this.modelSelect) {
      this.modelSelect.value = modelType;
      this._updateModelDescriptions(modelType);
      this._saveModelSettings();
    }
  }

  /**
   * Sync canvas dimensions with video feed resolution
   * @param {HTMLVideoElement} [videoElement]
   */
  initCanvas(videoElement) {
    const vid = videoElement || this.video;
    if (vid && this.canvas) {
      const width = vid.videoWidth || 1280;
      const height = vid.videoHeight || 720;
      this.canvas.width = width;
      this.canvas.height = height;
      console.log(`[UIController] Canvas synchronized with video: ${width}x${height}`);
    }
  }

  /**
   * Clear bounding box canvas overlay
   */
  clearDetections() {
    if (this.canvas) {
      const ctx = this.canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }

  /**
   * Draw bounding box detections on canvas overlay
   * Rim = Green (#00FF88), Ball = Orange (#FF6B35)
   * @param {HTMLCanvasElement|Array} canvasOrDetections
   * @param {Array} [detections]
   */
  drawDetections(canvasOrDetections, detections) {
    let canvas = this.canvas;
    let list = [];

    if (canvasOrDetections instanceof HTMLCanvasElement) {
      canvas = canvasOrDetections;
      list = Array.isArray(detections) ? detections : [];
    } else if (Array.isArray(canvasOrDetections)) {
      list = canvasOrDetections;
    }

    if (!canvas) return;

    // Dynamically auto-synchronize canvas internal resolution with actual video stream
    // Prevents bounding box distortion/offset on mobile devices in portrait/landscape modes
    if (this.video && this.video.videoWidth > 0 && this.video.videoHeight > 0) {
      if (canvas.width !== this.video.videoWidth || canvas.height !== this.video.videoHeight) {
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
      }
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // List of boxes to render
    const renderList = [];

    // If manual rim is active, add it to render list
    if (this.manualRimRoi) {
      renderList.push({
        bbox: { ...this.manualRimRoi },
        class: 'rim',
        confidence: 1.0,
        isManual: true,
      });
    }

    for (const d of list) {
      if (!d || !d.bbox) continue;
      const cls = (d.class || '').toLowerCase();
      const isRim = !cls.includes('ball') && !cls.includes('made') && (cls === '1' || cls.includes('rim') || cls.includes('hoop') || cls.includes('backboard') || cls === 'basket');

      // If manual rim is active, skip auto-detected rim to prevent duplicate boxes
      if (this.manualRimRoi && isRim) {
        continue;
      }
      renderList.push(d);
    }

    // 60 FPS Kinematic Trajectory Interpolator for Ball Tracking
    const now = performance.now();
    const hasBallInDetections = list.some((d) => d && d.class && (d.class === '2' || d.class.toLowerCase().includes('ball')));

    if (hasBallInDetections) {
      const ballDet = list.find((d) => d && d.class && (d.class === '2' || d.class.toLowerCase().includes('ball')));
      if (ballDet && ballDet.bbox) {
        if (!this.ballInterpolatedBox) {
          this.ballInterpolatedBox = {
            x: ballDet.bbox.x,
            y: ballDet.bbox.y,
            width: ballDet.bbox.width,
            height: ballDet.bbox.height,
            vx: 0,
            vy: 0,
            lastSeen: now,
          };
        } else {
          const dt = Math.max(0.001, Math.min(0.5, (now - (this.lastInterpolationTime || now)) / 1000));
          const rawVx = (ballDet.bbox.x - this.ballInterpolatedBox.x) / dt;
          const rawVy = (ballDet.bbox.y - this.ballInterpolatedBox.y) / dt;
          this.ballInterpolatedBox.vx = this.ballInterpolatedBox.vx * 0.35 + rawVx * 0.65;
          this.ballInterpolatedBox.vy = this.ballInterpolatedBox.vy * 0.35 + rawVy * 0.65;

          // Smooth EMA follow
          this.ballInterpolatedBox.x += (ballDet.bbox.x - this.ballInterpolatedBox.x) * 0.5;
          this.ballInterpolatedBox.y += (ballDet.bbox.y - this.ballInterpolatedBox.y) * 0.5;
          this.ballInterpolatedBox.width += (ballDet.bbox.width - this.ballInterpolatedBox.width) * 0.5;
          this.ballInterpolatedBox.height += (ballDet.bbox.height - this.ballInterpolatedBox.height) * 0.5;
          this.ballInterpolatedBox.lastSeen = now;
        }
      }
    } else if (this.ballInterpolatedBox && (now - this.ballInterpolatedBox.lastSeen < 220)) {
      // Extrapolate between slower AI detection intervals using gravity kinematics
      const dt = Math.max(0.001, Math.min(0.05, (now - (this.lastInterpolationTime || now)) / 1000));
      this.ballInterpolatedBox.vy += 980 * dt; // Gravity
      this.ballInterpolatedBox.x += this.ballInterpolatedBox.vx * dt;
      this.ballInterpolatedBox.y += this.ballInterpolatedBox.vy * dt;

      renderList.push({
        class: 'ball',
        confidence: 0.9,
        isInterpolated: true,
        bbox: {
          x: Math.round(this.ballInterpolatedBox.x),
          y: Math.round(this.ballInterpolatedBox.y),
          width: Math.round(this.ballInterpolatedBox.width),
          height: Math.round(this.ballInterpolatedBox.height),
        },
      });
    } else if (this.ballInterpolatedBox && (now - this.ballInterpolatedBox.lastSeen >= 220)) {
      this.ballInterpolatedBox = null;
    }
    this.lastInterpolationTime = now;

    for (const d of renderList) {
      if (!d || !d.bbox) continue;
      let { x, y, width, height } = d.bbox;
      const cls = (d.class || '').toLowerCase();
      const isBall = cls === '2' || cls.includes('ball');
      const isMade = cls.includes('made');
      const isRim = !isBall && !isMade && (cls === '1' || cls.includes('rim') || cls.includes('hoop') || cls.includes('backboard') || cls === 'basket');
      const isPerson = !isBall && !isMade && !isRim && (cls === '0' || cls.includes('peop') || cls.includes('person') || cls.includes('player') || cls.includes('human'));

      // Use smoothed interpolated coordinates for rendering ball
      if (isBall && this.ballInterpolatedBox) {
        x = Math.round(this.ballInterpolatedBox.x);
        y = Math.round(this.ballInterpolatedBox.y);
        width = Math.round(this.ballInterpolatedBox.width);
        height = Math.round(this.ballInterpolatedBox.height);
      }

      let color = '#FF6B35';
      let label = cls.toUpperCase();
      let fillColor = 'rgba(255, 107, 53, 0.1)';

      if (d.isManual) {
        color = '#00FF88';
        label = '🎯 RIM (PINNED 📌)';
        fillColor = 'rgba(0, 255, 136, 0.18)';
      } else if (isMade) {
        color = '#00E5FF';
        label = 'MADE BASKET 🎯';
        fillColor = 'rgba(0, 229, 255, 0.2)';
      } else if (isBall) {
        color = '#FF6B35';
        label = 'BALL';
        fillColor = 'rgba(255, 107, 53, 0.12)';
      } else if (isRim) {
        color = '#00FF88';
        label = 'RIM';
        fillColor = 'rgba(0, 255, 136, 0.1)';
      } else if (isPerson) {
        color = '#4CC9F0';
        label = 'PERSON';
        fillColor = 'rgba(76, 201, 240, 0.08)';
      }

      const confPercent = Math.round((d.confidence || 0) * 100);

      // 1. Draw Bounding Box Outline
      ctx.lineWidth = d.isManual ? 3.5 : 3;
      ctx.strokeStyle = color;
      ctx.strokeRect(x, y, width, height);

      // 2. Draw Semi-transparent Box Background Fill
      ctx.fillStyle = fillColor;
      ctx.fillRect(x, y, width, height);

      // 3. Draw Label Badge Tag
      ctx.font = 'bold 13px Outfit, Inter, sans-serif';
      const tagText = d.isManual ? label : `${label} ${confPercent}%`;
      const textMetrics = ctx.measureText(tagText);
      const tagWidth = textMetrics.width + 14;
      const tagHeight = 22;
      const tagY = y - tagHeight > 0 ? y - tagHeight : y;

      ctx.fillStyle = color;
      ctx.fillRect(x, tagY, tagWidth, tagHeight);

      // Text inside tag
      ctx.fillStyle = '#0F0F1A';
      ctx.fillText(tagText, x + 7, tagY + 16);
    }

    // If currently dragging to draw manual rim, render dashed preview box
    if (this.isDrawingRim && this.currentDragBox && this.currentDragBox.width > 2 && this.currentDragBox.height > 2) {
      const { x, y, width, height } = this.currentDragBox;
      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#00FF88';
      ctx.fillStyle = 'rgba(0, 255, 136, 0.25)';
      ctx.strokeRect(x, y, width, height);
      ctx.fillRect(x, y, width, height);

      ctx.setLineDash([]);
      ctx.fillStyle = '#00FF88';
      ctx.fillRect(x, y > 24 ? y - 24 : y, 120, 22);
      ctx.fillStyle = '#0F0F1A';
      ctx.font = 'bold 12px Outfit, sans-serif';
      ctx.fillText('🎯 กำหนดห่วง...', x + 8, (y > 24 ? y - 24 : y) + 15);
      ctx.restore();
    }
  }

  /**
   * Increment score display with pulse + glow animation
   */
  incrementScore() {
    this.currentScore++;
    if (this.scoreElement) {
      this.scoreElement.textContent = this.currentScore;
      this.scoreElement.classList.add('scored-anim');
      setTimeout(() => {
        if (this.scoreElement) {
          this.scoreElement.classList.remove('scored-anim');
        }
      }, 500);
    }
  }

  /**
   * Reset score display to 0
   */
  resetScore() {
    this.currentScore = 0;
    if (this.scoreElement) {
      this.scoreElement.textContent = '0';
    }
  }

  /**
   * Toggle Browser Fullscreen Mode
   */
  async toggleFullscreen() {
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const root = document.documentElement;
        if (root.requestFullscreen) {
          await root.requestFullscreen();
        } else if (root.webkitRequestFullscreen) {
          await root.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('[UIController] Fullscreen toggle error:', err);
    }
  }

  /**
   * Show settings drawer panel
   */
  showSettings() {
    if (this.settingsPanel) {
      this.settingsPanel.classList.remove('hidden');
    }
  }

  /**
   * Hide settings drawer panel
   */
  hideSettings() {
    if (this.settingsPanel) {
      this.settingsPanel.classList.add('hidden');
    }
  }

  /**
   * Show error overlay message
   * @param {string} message 
   */
  showError(message) {
    if (this.statusIndicator && this.statusText) {
      this.statusIndicator.classList.remove('hidden');
      if (this.statusSpinner) {
        this.statusSpinner.style.display = 'none';
      }
      this.statusText.textContent = `❌ ${message}`;
      this.statusText.style.color = 'var(--color-danger)';
    }
  }

  /**
   * Show loading overlay indicator
   * @param {string} [message='กำลังโหลด...']
   */
  showLoading(message = 'กำลังโหลด...') {
    if (this.statusIndicator && this.statusText) {
      this.statusIndicator.classList.remove('hidden');
      if (this.statusSpinner) {
        this.statusSpinner.style.display = 'block';
      }
      this.statusText.textContent = message;
      this.statusText.style.color = 'var(--text-main)';
    }
  }

  /**
   * Hide loading/status overlay
   */
  hideLoading() {
    if (this.statusIndicator) {
      this.statusIndicator.classList.add('hidden');
    }
  }

  /**
   * Set status text or hide if empty
   * @param {string|null} text 
   */
  setStatus(text) {
    if (!text) {
      this.hideLoading();
    } else {
      this.showLoading(text);
    }
  }

  /**
   * Populate camera selection dropdown
   * @param {Array<{deviceId: string, label: string}>} devices 
   * @param {string} [activeDeviceId] 
   */
  populateCameraList(devices, activeDeviceId) {
    if (!this.cameraSelect) return;
    this.cameraSelect.innerHTML = '';

    if (!devices || devices.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '📷 ไม่พบกล้อง';
      this.cameraSelect.appendChild(opt);
      return;
    }

    devices.forEach((dev, idx) => {
      const opt = document.createElement('option');
      opt.value = dev.deviceId;
      opt.textContent = dev.label || `📷 กล้อง ${idx + 1}`;
      if (dev.deviceId === activeDeviceId) {
        opt.selected = true;
      }
      this.cameraSelect.appendChild(opt);
    });
  }

  // =========================================================================
  // Event Binding Methods (Mediator Pattern for main.js)
  // =========================================================================

  /**
   * Bind reset button click handler
   * @param {Function} handler 
   */
  bindReset(handler) {
    if (this.btnReset && typeof handler === 'function') {
      this.btnReset.addEventListener('click', () => handler());
    }
  }

  /**
   * Bind camera dropdown change handler
   * @param {Function} handler (deviceId) => void
   */
  bindCameraChange(handler) {
    if (this.cameraSelect && typeof handler === 'function') {
      this.cameraSelect.addEventListener('change', (e) => {
        handler(e.target.value);
      });
    }
  }

  /**
   * Bind sound choice / custom upload change handler
   * @param {Function} handler (soundId, customFile) => void
   */
  bindSoundChange(handler) {
    if (typeof handler !== 'function') return;

    if (this.soundRadios) {
      this.soundRadios.forEach((radio) => {
        radio.addEventListener('change', (e) => {
          if (e.target.value !== 'custom') {
            handler(e.target.value, null);
          }
        });
      });
    }

    if (this.customSoundFile) {
      this.customSoundFile.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          handler('custom', file);
        }
      });
    }
  }

  /**
   * Bind volume slider change handler
   * @param {Function} handler (volume: number 0.0-1.0) => void
   */
  bindVolumeChange(handler) {
    if (this.volumeSlider && typeof handler === 'function') {
      this.volumeSlider.addEventListener('input', (e) => {
        const level = parseInt(e.target.value, 10) / 100;
        handler(level);
      });
    }
  }

  /**
   * Bind sensitivity / confidence slider change handler
   * @param {Function} handler (threshold: number 0.0-1.0) => void
   */
  bindSensitivityChange(handler) {
    if (this.confidenceSlider && typeof handler === 'function') {
      this.confidenceSlider.addEventListener('input', (e) => {
        const threshold = parseInt(e.target.value, 10) / 100;
        handler(threshold);
      });
    }
  }

  /**
   * Bind test sound button click handler
   * @param {Function} handler () => void
   */
  bindTestSound(handler) {
    const btn = document.getElementById('btn-test-sound');
    if (btn && typeof handler === 'function') {
      btn.addEventListener('click', handler);
    }
  }

  /**
   * Bind model apply / switch button click handler
   * @param {Function} handler ({ modelType, customModelId, customApiKey }) => void
   */
  bindModelChange(handler) {
    if (this.btnApplyModel && typeof handler === 'function') {
      this.btnApplyModel.addEventListener('click', () => {
        const settings = this.getModelSettings();
        handler(settings);
      });
    }
  }
}

export { UIController as UIManager };

