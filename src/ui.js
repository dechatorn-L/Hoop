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

    this.currentScore = 0;

    this._setupInternalEventListeners();
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
}

export { UIController as UIManager };
