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

    this.currentScore = 0;

    this._setupInternalEventListeners();
    this._loadSavedModelSettings();
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
        'local-onnx-swish': '⚡ Local ONNX: Swish-Vision (11.7 MB) Fine-tuned Basketball-1 คมชัด ไม่ตีกรอบรวมกับคน (เร็วสุด 30-60 FPS)',
        'local-onnx-yolo11': '⚡ Local ONNX: YOLO11s Basketball (36.2 MB) สถาปัตยกรรมล่าสุด Attention C2PSA จับลูกความเร็วสูงและแสงแดดย้อนกลางแจ้ง',
        'local-onnx-world': '⚡ Local ONNX: YOLO-World (47.8 MB) Open-Vocabulary AI วิเคราะห์ภาษา ไม่หลอนพัดลม/โคมไฟ',
        'local-onnx-pro': '⚡ Local ONNX: Pro High-Precision (42.7 MB - YOLOv8s) แม่นยำสูงระดับโปร สำหรับชู้ตระยะไกล 3–8 เมตร',
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
      const savedType = localStorage.getItem('hoop_selected_model_type');
      const savedModelId = localStorage.getItem('hoop_custom_model_id');
      const savedApiKey = localStorage.getItem('hoop_custom_api_key');

      if (savedType && this.modelSelect) {
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

    for (const d of list) {
      if (!d || !d.bbox) continue;
      const { x, y, width, height } = d.bbox;
      const cls = (d.class || '').toLowerCase();
      const isRim = cls.includes('rim') || cls.includes('hoop');
      const isBall = cls.includes('ball');
      const isPerson = cls.includes('peop') || cls.includes('person');

      let color = '#FF6B35';
      let label = cls.toUpperCase();
      let fillColor = 'rgba(255, 107, 53, 0.1)';

      if (isRim) {
        color = '#00FF88';
        label = 'RIM';
        fillColor = 'rgba(0, 255, 136, 0.1)';
      } else if (isBall) {
        color = '#FF6B35';
        label = 'BALL';
        fillColor = 'rgba(255, 107, 53, 0.12)';
      } else if (isPerson) {
        color = '#4CC9F0';
        label = 'PERSON';
        fillColor = 'rgba(76, 201, 240, 0.08)';
      }

      const confPercent = Math.round((d.confidence || 0) * 100);

      // 1. Draw Bounding Box Outline
      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      ctx.strokeRect(x, y, width, height);

      // 2. Draw Semi-transparent Box Background Fill
      ctx.fillStyle = fillColor;
      ctx.fillRect(x, y, width, height);

      // 3. Draw Label Badge Tag
      ctx.font = 'bold 13px Outfit, Inter, sans-serif';
      const tagText = `${label} ${confPercent}%`;
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

