/**
 * @fileoverview UI Controller & Canvas Overlay Manager
 * Handles UI interactions, settings drawer, animations, and canvas detection rendering.
 */

import { getLanguage, setLanguage, t, translateDocument, translateMessage } from './i18n.js';

export class UIController {
  constructor() {
    this.practiceButton = document.getElementById('btn-practice');
    this.openCameraButton = document.getElementById('btn-open-camera');
    this.practiceReadiness = document.getElementById('practice-readiness');
    const guide = document.getElementById('positioning-guide');
    if (guide) {
      try { guide.open = localStorage.getItem('hoop_positioning_seen') !== 'true'; } catch { guide.open = true; }
      guide.addEventListener('toggle', () => {
        if (!guide.open) {
          try { localStorage.setItem('hoop_positioning_seen', 'true'); } catch { /* Guidance remains available without storage. */ }
        }
      });
    }
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
    this.btnConfirmDrawRim = document.getElementById('btn-confirm-draw-rim');
    this.rimInputMethod = document.getElementById('rim-input-method');
    this.rimDraftStatus = document.getElementById('rim-draft-status');
    this.toggleHoopRoi = document.getElementById('toggle-hoop-roi');

    this.isDrawingRim = false;
    this.dragStart = null;
    this.currentDragBox = null;
    this.manualRimRoi = null;
    this.isHoopRoiTurboEnabled = true;

    this.currentScore = 0;

    this._loadManualRimRoi();
    this._setupInternalEventListeners();
    this._setupManualRimEvents();
    this._loadSavedModelSettings();
    this.languageSelect = document.getElementById('language-select');
    this.languageSelect?.addEventListener('change', () => {
      setLanguage(this.languageSelect.value);
      this._translateInterface();
    });
    this._translateInterface();
  }

  _translateInterface() {
    translateDocument();
    if (this.languageSelect) this.languageSelect.value = getLanguage();
    this._updateManualRimUI();
    this._updateModelDescriptions(this.modelSelect?.value);
    this._updateFullscreenLabels();
    for (const option of this.cameraSelect?.options || []) {
      if (option.dataset.cameraNumber) option.textContent = t('cameraNumber', { number: option.dataset.cameraNumber });
      if (option.dataset.noCamera) option.textContent = t('noCamera');
    }
    if (this.statusMessage) this._renderStatus();
    if (this.practiceView) this.updatePracticeControls(this.practiceView);
    this._updateRimDraftUI();
  }

  _updateFullscreenLabels() {
    if (!this.btnFullscreen) return;
    const key = document.fullscreenElement || document.webkitFullscreenElement ? 'exitFullscreen' : 'fullscreen';
    this.btnFullscreen.textContent = t(key);
    this.btnFullscreen.title = t(key);
    this.btnFullscreen.setAttribute('aria-label', t(key));
  }

  /**
   * Load saved manual rim ROI and Turbo toggle from localStorage
   * @private
   */
  _loadManualRimRoi() {
    try {
      const saved = localStorage.getItem('hoop_manual_rim_roi');
      if (saved) {
        this.manualRimRoi = JSON.parse(saved);
        this._updateManualRimUI();
      }
      const savedTurbo = localStorage.getItem('hoop_roi_turbo_enabled');
      this.isHoopRoiTurboEnabled = savedTurbo !== null ? (savedTurbo === 'true') : true;
      if (this.toggleHoopRoi) {
        this.toggleHoopRoi.checked = this.isHoopRoiTurboEnabled;
      }
    } catch (err) {
      console.warn('[UIController] Could not load saved manual rim ROI:', err);
    }
  }

  /**
   * Check if Hoop ROI Turbo cropping should be used for inference
   * @returns {boolean}
   */
  isHoopRoiEnabled() {
    return Boolean(this.isHoopRoiTurboEnabled && this.manualRimRoi);
  }

  /**
   * Setup interactive canvas touch/mouse drawing listeners for Manual Rim Box
   * @private
   */
  _setupManualRimEvents() {
    if (this.toggleHoopRoi) {
      this.toggleHoopRoi.addEventListener('change', (e) => {
        this.isHoopRoiTurboEnabled = e.target.checked;
        localStorage.setItem('hoop_roi_turbo_enabled', String(this.isHoopRoiTurboEnabled));
        console.log('⚡ Hoop ROI Turbo:', this.isHoopRoiTurboEnabled);
      });
    }

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
    this.btnConfirmDrawRim?.addEventListener('click', () => this.confirmDrawingRim());
    this.rimInputMethod?.addEventListener('change', () => {
      this._releaseRimPointer();
      this._resetRimDraft();
      this.canvas?.focus({ preventScroll: true });
    });

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

      if (clientX < renderLeft || clientX > renderLeft + renderWidth || clientY < renderTop || clientY > renderTop + renderHeight) return null;

      const x = Math.max(0, Math.min(this.canvas.width || 640, (clientX - renderLeft) * scaleX));
      const y = Math.max(0, Math.min(this.canvas.height || 480, (clientY - renderTop) * scaleY));

      return { x: Math.round(x), y: Math.round(y) };
    };

    // Pointer Events keep one owner for each gesture, including touch and pen.
    this.canvas.addEventListener('pointerdown', e => {
      if (!this.isDrawingRim || this.rimPointerId != null || e.isPrimary === false || e.button !== 0) return;
      const point = getCanvasPoint(e);
      if (!point) return;
      e.preventDefault();
      this.rimPointerId = e.pointerId;
      this.dragStart = point;
      this.rimPointerStart = { x: e.clientX, y: e.clientY };
      this.rimPointerMoved = false;
      this.rimKeyboardActive = false;
      if (this.rimInputMethod.value === 'drag') this._resetRimDraft();
      this.canvas.setPointerCapture(e.pointerId);
      this._updateRimDraftUI();
    });
    this.canvas.addEventListener('pointermove', e => {
      if (!this.isDrawingRim || e.pointerId !== this.rimPointerId) return;
      e.preventDefault();
      if (Math.hypot(e.clientX - this.rimPointerStart.x, e.clientY - this.rimPointerStart.y) > 6) this.rimPointerMoved = true;
      const point = getCanvasPoint(e);
      if (point && this.rimInputMethod.value === 'drag') this._draftRimBox(this.dragStart, point);
    });
    this.canvas.addEventListener('pointerup', e => {
      if (!this.isDrawingRim || e.pointerId !== this.rimPointerId) return;
      e.preventDefault();
      const point = getCanvasPoint(e);
      const start = this.dragStart;
      const moved = this.rimPointerMoved;
      this._releaseRimPointer();
      if (!point) return this._resetRimDraft('rimGestureInterrupted');
      if (this.rimInputMethod.value === 'corners') {
        if (!moved) this._placeRimCorner(point);
        else this._resetRimDraft('rimGestureInterrupted');
      } else this._draftRimBox(start, point);
    });
    const interrupt = e => {
      if (this.isDrawingRim && this.rimPointerId != null && e.pointerId === this.rimPointerId) {
        this._releaseRimPointer();
        this._resetRimDraft('rimGestureInterrupted');
      }
    };
    this.canvas.addEventListener('pointercancel', interrupt);
    this.canvas.addEventListener('lostpointercapture', interrupt);
    window.addEventListener('blur', () => {
      if (this.isDrawingRim) { this._releaseRimPointer(); this._resetRimDraft('rimGestureInterrupted'); }
    });
    this.canvas.addEventListener('keydown', e => {
      if (!this.isDrawingRim) return;
      this.rimKeyboardActive = true;
      if (e.key === 'Escape') { e.preventDefault(); return this.stopDrawingRim(); }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); return this._placeRimCorner(this.rimCursor); }
      const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (!directions[e.key]) return;
      e.preventDefault();
      const [dx, dy] = directions[e.key], step = e.shiftKey ? 20 : 5;
      this.rimCursor = { x: Math.max(0, Math.min(this.canvas.width, this.rimCursor.x + dx * step)), y: Math.max(0, Math.min(this.canvas.height, this.rimCursor.y + dy * step)) };
      if (this.rimFirstCorner) this._draftRimBox(this.rimFirstCorner, this.rimCursor);
    });
  }

  _releaseRimPointer() {
    const id = this.rimPointerId;
    this.rimPointerId = null;
    this.dragStart = null;
    if (id != null && this.canvas?.hasPointerCapture(id)) this.canvas.releasePointerCapture(id);
  }

  _resetRimDraft(status = 'rimSelectFirst') {
    this.rimFirstCorner = null;
    this.currentDragBox = null;
    this.rimDraftSize = { width: this.canvas?.width, height: this.canvas?.height };
    this.rimCursor = { x: Math.round((this.canvas?.width || 640) / 2), y: Math.round((this.canvas?.height || 480) / 2) };
    this.rimDraftMessage = status;
    this._updateRimDraftUI();
  }

  _draftRimBox(start, end) {
    this.currentDragBox = { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(start.x - end.x), height: Math.abs(start.y - end.y) };
    this.rimDraftMessage = this.rimFirstCorner ? 'rimSelectSecond' : this._isUsableRimBox(this.currentDragBox) ? 'rimDraftReady' : 'rimBoxTooSmall';
    this._updateRimDraftUI();
  }

  _placeRimCorner(point) {
    if (this.rimFirstCorner) {
      const start = this.rimFirstCorner;
      this.rimFirstCorner = null;
      this._draftRimBox(start, point);
    } else {
      this.currentDragBox = null;
      this.rimFirstCorner = { ...point };
      this.rimCursor = { ...point };
      this.rimDraftMessage = 'rimSelectSecond';
      this._updateRimDraftUI();
    }
  }

  _isUsableRimBox(box) {
    return !!box && [box.x, box.y, box.width, box.height].every(Number.isFinite)
      && box.width >= 15 && box.height >= 15 && box.x >= 0 && box.y >= 0
      && box.x + box.width <= this.canvas.width && box.y + box.height <= this.canvas.height;
  }

  _updateRimDraftUI() {
    if (this.btnConfirmDrawRim) this.btnConfirmDrawRim.disabled = !this.isDrawingRim || this.rimPointerId != null || !!this.rimFirstCorner || !this._isUsableRimBox(this.currentDragBox);
    if (this.rimDraftStatus) this.rimDraftStatus.textContent = t(this.rimDraftMessage || 'rimSelectFirst');
    if (this.canvas && this.isDrawingRim) this.canvas.setAttribute('aria-label', t('rimCanvas'));
  }

  confirmDrawingRim() {
    if (!this.isDrawingRim || this.rimPointerId != null || this.rimFirstCorner) return;
    if (this.rimDraftSize.width !== this.canvas.width || this.rimDraftSize.height !== this.canvas.height) {
      this._resetRimDraft('rimSourceChanged');
      return;
    }
    if (!this._isUsableRimBox(this.currentDragBox)) {
      this.rimDraftMessage = 'rimBoxTooSmall';
      this._updateRimDraftUI();
      return;
    }
    this.setManualRimRoi(this.currentDragBox);
    this.stopDrawingRim();
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
    this._releaseRimPointer();
    this.isDrawingRim = true;
    this.dragStart = null;
    this.currentDragBox = null;
    this.clearDetections();
    document.body.classList.add('drawing-active');
    if (this.rimDrawBanner) this.rimDrawBanner.classList.remove('hidden');
    if (this.btnPinRim) this.btnPinRim.classList.add('btn-pin-active');
    if (this.canvas) this.canvas.classList.add('canvas-drawing-mode');
    this._resetRimDraft();
    this.rimKeyboardActive = false;
    this.canvas?.removeAttribute('aria-hidden');
    this.canvas?.setAttribute('role', 'group');
    this.canvas?.setAttribute('tabindex', '0');
    this.canvas?.setAttribute('aria-describedby', 'rim-framing-instructions rim-draft-status');
    this.canvas?.focus({ preventScroll: true });
    this.onRimChange?.();
  }

  /**
   * Stop manual rim drawing mode
   */
  stopDrawingRim() {
    this._releaseRimPointer();
    const wasDrawing = this.isDrawingRim;
    this.isDrawingRim = false;
    this.dragStart = null;
    this.currentDragBox = null;
    document.body.classList.remove('drawing-active');
    if (this.rimDrawBanner) this.rimDrawBanner.classList.add('hidden');
    if (this.btnPinRim) this.btnPinRim.classList.remove('btn-pin-active');
    if (this.canvas) this.canvas.classList.remove('canvas-drawing-mode');
    this._resetRimDraft();
    this.canvas?.setAttribute('aria-hidden', 'true');
    this.canvas?.removeAttribute('tabindex');
    this.canvas?.removeAttribute('role');
    this.canvas?.removeAttribute('aria-label');
    this.canvas?.removeAttribute('aria-describedby');
    if (wasDrawing) {
      const target = this.btnPinRim?.offsetParent ? this.btnPinRim : document.querySelector('#secondary-controls > summary');
      target?.focus({ preventScroll: true });
    }
    this.onRimChange?.();
  }

  /**
   * Set and persist manual rim ROI
   * @param {Object} roi { x, y, width, height }
   */
  setManualRimRoi(roi) {
    if (!this._isUsableRimBox(roi)) return;
    this.manualRimRoi = {
      x: Math.round(roi.x),
      y: Math.round(roi.y),
      width: Math.round(roi.width),
      height: Math.round(roi.height),
      canvasW: this.canvas?.width || 640,
      canvasH: this.canvas?.height || 480,
    };
    try {
      localStorage.setItem('hoop_manual_rim_roi', JSON.stringify(this.manualRimRoi));
    } catch (err) {
      console.warn('[UIController] Could not save manual rim to localStorage:', err);
    }
    this._updateManualRimUI();
    this.onRimChange?.();
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
   * Get active manual rim ROI detection object with resolution scaling
   * @returns {Object|null}
   */
  getManualRimRoi() {
    if (!this.manualRimRoi) return null;
    const { x, y, width, height, canvasW, canvasH } = this.manualRimRoi;
    let scaledX = x, scaledY = y, scaledW = width, scaledH = height;
    if (this.canvas && canvasW && canvasH && (this.canvas.width !== canvasW || this.canvas.height !== canvasH)) {
      const scaleX = this.canvas.width / canvasW;
      const scaleY = this.canvas.height / canvasH;
      scaledX = Math.round(x * scaleX);
      scaledY = Math.round(y * scaleY);
      scaledW = Math.round(width * scaleX);
      scaledH = Math.round(height * scaleY);
    }
    return {
      bbox: { x: scaledX, y: scaledY, width: scaledW, height: scaledH },
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
      this.btnPinRim.textContent = t(isPinned ? 'editRim' : 'lockRim');
      this.btnPinRim.title = t(isPinned ? 'editRimTitle' : 'lockRimTitle');
    }
    if (this.rimStatusBox) {
      this.rimStatusBox.classList.toggle('pinned', isPinned);
    }
    if (this.rimStatusText) {
      this.rimStatusText.textContent = t(isPinned ? 'rimModeLocked' : 'rimModeAuto');
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
        this._updateFullscreenLabels();

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
      this.modalGuide.showModal();
    }
  }

  /**
   * Hide Model Guide Modal
   */
  hideModelGuide() {
    if (this.modalGuide) {
      this.modalGuide.close();
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
      this.modelInfoText.textContent = t(modelType ? `model.${modelType}` : 'chooseModel');
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
        'local-onnx-swish-int8',
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
      if (this.isDrawingRim && (this.canvas.width !== width || this.canvas.height !== height)) {
        this._releaseRimPointer();
        this.canvas.width = width;
        this.canvas.height = height;
        this._resetRimDraft('rimSourceChanged');
      }
      if (this.canvas.width !== width) this.canvas.width = width;
      if (this.canvas.height !== height) this.canvas.height = height;
      console.log(`[UIController] Canvas synchronized with video: ${width}x${height}`);
    }
  }

  /**
   * Clear bounding box canvas overlay
   */
  clearDetections() {
    this.ballInterpolatedBox = null;
    this.lastBallAiTimestamp = null;
    this.lastBallAiTime = null;
    this.lastAiBallX = null;
    this.lastAiBallY = null;
    this.lastInterpolationTime = null;
    if (this.canvas) {
      const ctx = this.canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }

  /**
   * Get active interpolated ball position box (if gliding in 60 FPS)
   * @returns {Object|null}
   */
  getBallInterpolatedBox() {
    return this.ballInterpolatedBox;
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
        this.initCanvas(this.video);
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
        bbox: { ...this.getManualRimRoi().bbox },
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
    const ballDet = list.find((d) => d && d.class && (d.class === '2' || d.class.toLowerCase().includes('ball')));

    if (ballDet && ballDet.bbox) {
      const isNewAiUpdate = ballDet._timestamp && ballDet._timestamp !== this.lastBallAiTimestamp;

      if (isNewAiUpdate) {
        // AI ground truth arrived: update velocity vector and anchor
        const dtAi = this.lastBallAiTime ? Math.max(0.015, Math.min(0.8, (now - this.lastBallAiTime) / 1000)) : 0.05;
        this.lastBallAiTime = now;
        this.lastBallAiTimestamp = ballDet._timestamp;

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
          this.lastAiBallX = ballDet.bbox.x;
          this.lastAiBallY = ballDet.bbox.y;
        } else {
          // Calculate true velocity from previous AI ground truth to new AI ground truth
          const prevAiX = this.lastAiBallX ?? this.ballInterpolatedBox.x;
          const prevAiY = this.lastAiBallY ?? this.ballInterpolatedBox.y;
          const rawVx = (ballDet.bbox.x - prevAiX) / dtAi;
          const rawVy = (ballDet.bbox.y - prevAiY) / dtAi;
          this.ballInterpolatedBox.vx = this.ballInterpolatedBox.vx * 0.3 + rawVx * 0.7;
          this.ballInterpolatedBox.vy = this.ballInterpolatedBox.vy * 0.3 + rawVy * 0.7;

          // Store current AI ground truth position for next velocity delta
          this.lastAiBallX = ballDet.bbox.x;
          this.lastAiBallY = ballDet.bbox.y;

          // Anchor directly to the fresh AI ground truth
          this.ballInterpolatedBox.x = ballDet.bbox.x;
          this.ballInterpolatedBox.y = ballDet.bbox.y;
          this.ballInterpolatedBox.width = ballDet.bbox.width;
          this.ballInterpolatedBox.height = ballDet.bbox.height;
          this.ballInterpolatedBox.lastSeen = now;
        }
      } else if (this.ballInterpolatedBox && (now - this.ballInterpolatedBox.lastSeen < 350)) {
        // Intermediate 60 FPS render frame: Smoothly glide ball along velocity trajectory!
        const dt = Math.max(0.001, Math.min(0.035, (now - (this.lastInterpolationTime || now)) / 1000));
        this.ballInterpolatedBox.vy += 980 * dt; // Gravity
        this.ballInterpolatedBox.x += this.ballInterpolatedBox.vx * dt;
        this.ballInterpolatedBox.y += this.ballInterpolatedBox.vy * dt;
      }
    } else if (this.ballInterpolatedBox && (now - this.ballInterpolatedBox.lastSeen < 350)) {
      // Extrapolate if ball momentarily undetected
      const dt = Math.max(0.001, Math.min(0.035, (now - (this.lastInterpolationTime || now)) / 1000));
      this.ballInterpolatedBox.vy += 980 * dt;
      this.ballInterpolatedBox.x += this.ballInterpolatedBox.vx * dt;
      this.ballInterpolatedBox.y += this.ballInterpolatedBox.vy * dt;
    } else if (this.ballInterpolatedBox && (now - this.ballInterpolatedBox.lastSeen >= 350)) {
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

      let color = '#E06338';
      let label = cls.toUpperCase();
      let fillColor = 'rgba(224, 99, 56, 0.1)';

      if (d.isManual) {
        color = '#38BDF8';
        label = t('labelLockedRim');
        fillColor = 'rgba(56, 189, 248, 0.12)';
      } else if (isMade) {
        color = '#22C55E';
        label = t('labelMade');
        fillColor = 'rgba(34, 197, 94, 0.15)';
      } else if (isBall) {
        color = '#E06338';
        label = t('labelBall');
        fillColor = 'rgba(224, 99, 56, 0.12)';
      } else if (isRim) {
        color = '#38BDF8';
        label = t('labelRim');
        fillColor = 'rgba(56, 189, 248, 0.1)';
      } else if (isPerson) {
        color = '#64748B';
        label = t('labelPerson');
        fillColor = 'rgba(100, 116, 139, 0.08)';
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
      ctx.font = '600 14px Sarabun, sans-serif';
      const tagText = d.isManual ? label : `${label} ${confPercent}%`;
      const textMetrics = ctx.measureText(tagText);
      const tagWidth = textMetrics.width + 14;
      const tagHeight = 22;
      const tagY = y - tagHeight > 0 ? y - tagHeight : y;

      ctx.fillStyle = color;
      ctx.fillRect(x, tagY, tagWidth, tagHeight);

      // Text inside tag
      ctx.fillStyle = isPerson ? '#FFFFFF' : '#0F0F1A';
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
      ctx.font = '600 14px Sarabun, sans-serif';
      ctx.fillRect(x, y > 24 ? y - 24 : y, ctx.measureText(t('drawingRim')).width + 16, 22);
      ctx.fillStyle = '#0F0F1A';
      ctx.font = '600 14px Sarabun, sans-serif';
      ctx.fillText(t('drawingRim'), x + 8, (y > 24 ? y - 24 : y) + 15);
      ctx.restore();
    }
    if (this.isDrawingRim && (this.rimKeyboardActive || this.rimFirstCorner)) {
      const point = this.rimKeyboardActive ? this.rimCursor : this.rimFirstCorner;
      ctx.save();
      ctx.strokeStyle = '#00FF88';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(point.x - 10, point.y); ctx.lineTo(point.x + 10, point.y);
      ctx.moveTo(point.x, point.y - 10); ctx.lineTo(point.x, point.y + 10);
      ctx.stroke();
      ctx.restore();
    }
  }

  /**
   * Increment score display with a 220ms baseline reveal.
   */
  incrementScore() {
    this.currentScore++;
    if (this.scoreElement) {
      this.scoreElement.textContent = this.currentScore;
      this.scoreElement.style.setProperty('--score-digits', Math.max(3, String(this.currentScore).length));
      this.scoreElement.classList.remove('scored-anim');
      void this.scoreElement.offsetWidth; // Restart the single feedback animation for each score.
      this.scoreElement.classList.add('scored-anim');
    }
  }

  /**
   * Reset score display to 0
   */
  resetScore() {
    this.currentScore = 0;
    if (this.scoreElement) {
      this.scoreElement.textContent = '0';
      this.scoreElement.style.removeProperty('--score-digits');
      this.scoreElement.classList.remove('scored-anim');
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
      this.settingsPanel.showModal();
    }
  }

  /**
   * Hide settings drawer panel
   */
  hideSettings() {
    if (this.settingsPanel) {
      this.settingsPanel.close();
      this.settingsPanel.classList.add('hidden');
    }
  }

  /**
   * Show error overlay message
   * @param {string} message 
   */
  showError(message) {
    this.statusMessage = { message, error: true };
    this._renderStatus();
  }

  _renderStatus() {
    const { message, error } = this.statusMessage;
    if (this.statusIndicator && this.statusText) {
      this.statusIndicator.classList.remove('hidden');
      if (this.statusSpinner) {
        this.statusSpinner.style.display = error ? 'none' : 'block';
      }
      this.statusText.textContent = translateMessage(message);
      this.statusText.style.color = error ? 'var(--color-danger)' : 'var(--text-main)';
    }
  }

  /**
   * Show loading overlay indicator
   * @param {string} [message='กำลังโหลด...']
   */
  showLoading(message = { key: 'loading' }) {
    this.statusMessage = { message, error: false };
    this._renderStatus();
  }

  /**
   * Hide loading/status overlay
   */
  hideLoading() {
    this.statusMessage = null;
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
      opt.textContent = t('noCamera');
      opt.dataset.noCamera = 'true';
      this.cameraSelect.appendChild(opt);
      return;
    }

    devices.forEach((dev, idx) => {
      const opt = document.createElement('option');
      opt.value = dev.deviceId;
      opt.textContent = dev.label || t('cameraNumber', { number: idx + 1 });
      if (!dev.label) opt.dataset.cameraNumber = String(idx + 1);
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

  bindPractice(handler) {
    this.practiceButton?.addEventListener('click', handler);
  }

  bindOpenCamera(handler) {
    this.openCameraButton?.addEventListener('click', handler);
  }

  bindRimChange(handler) {
    this.onRimChange = handler;
  }

  updatePracticeControls({ state, cameraReady, modelReady, rimReady, canPractice, cameraLoading, modelLoading, cameraError, modelError }) {
    if (state === 'practice' && this.practiceView?.state !== 'practice') {
      const controls = document.getElementById('secondary-controls');
      if (controls) controls.open = false;
    }
    this.practiceView = { state, cameraReady, modelReady, rimReady, canPractice, cameraLoading, modelLoading, cameraError, modelError };
    const stateLabel = document.getElementById('practice-state');
    if (stateLabel) stateLabel.textContent = t(state === 'practice' ? 'practice' : state === 'paused' ? 'paused' : 'setup');
    if (this.practiceButton) {
      const text = t(state === 'practice' ? 'pausePractice' : state === 'paused' ? 'resumePractice' : 'startPractice');
      if (this.practiceButton.textContent !== text) this.practiceButton.textContent = text;
      this.practiceButton.disabled = state !== 'practice' && !canPractice;
    }
    if (this.openCameraButton) {
      this.openCameraButton.disabled = cameraLoading;
      this.openCameraButton.textContent = t(cameraLoading ? 'openingCamera' : cameraReady ? 'reopenCamera' : 'openCamera');
    }
    if (this.cameraSelect) this.cameraSelect.disabled = cameraLoading || !cameraReady;
    if (this.btnApplyModel) this.btnApplyModel.disabled = modelLoading;
    for (const button of [this.btnPinRim, this.btnSettingsPinRim]) {
      if (button) button.disabled = !cameraReady || cameraLoading;
    }
    const readiness = t('readiness', {
      camera: t(cameraReady ? 'ready' : cameraLoading ? 'opening' : 'notReady'),
      model: t(modelReady ? 'ready' : modelLoading ? 'loadingShort' : 'notReady'),
      rim: t(rimReady ? 'ready' : 'notReady'),
    });
    const recovery = cameraError ? ` — ${translateMessage(cameraError)} ${t('cameraRetry')}`
      : modelError ? ` — ${translateMessage(modelError)} ${t('modelRetry')}` : '';
    const text = `${t(state === 'practice' ? 'practice' : state === 'paused' ? 'paused' : 'setup')} — ${readiness}${recovery}`;
    if (this.practiceReadiness && this.practiceReadiness.textContent !== text) this.practiceReadiness.textContent = text;
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

