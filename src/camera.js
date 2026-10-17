/**
 * @fileoverview Camera Manager Module
 * Manages webcam & mobile camera access, device enumeration, switching, and error handling.
 * Adheres to ARCHITECTURE.md Section 2.2 and SPEC.md Section 3.1 & 6.
 */

import { DEFAULT_CONFIG } from './config.js';

export class CameraManager {
  /**
   * @param {HTMLVideoElement} videoElement - Target <video> DOM element
   * @param {Object} [config] - Optional camera configuration
   */
  constructor(videoElement, config = {}) {
    if (!videoElement) {
      throw new Error('CameraManager requires a valid HTMLVideoElement');
    }
    this.video = videoElement;
    this.config = {
      preferredResolution: config.preferredResolution || DEFAULT_CONFIG.preferredResolution || { width: 1280, height: 720 },
      facingMode: config.facingMode || DEFAULT_CONFIG.facingMode || 'environment',
    };
    this.currentStream = null;
    this.currentDeviceId = null;
    this.errorCallbacks = [];
    this.readyCallbacks = [];
  }

  /**
   * Register error listener
   * @param {Function} callback - Callback accepting ({ type: string, message: string, originalError: Error })
   */
  onError(callback) {
    if (typeof callback === 'function') {
      this.errorCallbacks.push(callback);
    }
  }

  /**
   * Register ready listener
   * @param {Function} callback - Callback accepting ({ video: HTMLVideoElement, stream: MediaStream })
   */
  onReady(callback) {
    if (typeof callback === 'function') {
      this.readyCallbacks.push(callback);
    }
  }

  /**
   * Notify error listeners
   * @private
   */
  _emitError(type, message, originalError) {
    console.error(`[CameraManager Error] ${type}: ${message}`, originalError);
    for (const cb of this.errorCallbacks) {
      try {
        cb({ type, message, originalError });
      } catch (err) {
        console.error('Error in CameraManager onError callback:', err);
      }
    }
  }

  /**
   * Notify ready listeners
   * @private
   */
  _emitReady() {
    for (const cb of this.readyCallbacks) {
      try {
        cb({ video: this.video, stream: this.currentStream });
      } catch (err) {
        console.error('Error in CameraManager onReady callback:', err);
      }
    }
  }

  /**
   * Get the video element
   * @returns {HTMLVideoElement}
   */
  getVideoElement() {
    return this.video;
  }

  /**
   * Get constraints object
   * @private
   * @param {string|null} deviceId 
   * @returns {MediaStreamConstraints}
   */
  _buildConstraints(deviceId = null) {
    const videoConstraints = {
      width: { ideal: this.config.preferredResolution.width },
      height: { ideal: this.config.preferredResolution.height },
    };

    if (deviceId) {
      videoConstraints.deviceId = { exact: deviceId };
    } else {
      videoConstraints.facingMode = { ideal: this.config.facingMode };
    }

    return {
      audio: false,
      video: videoConstraints,
    };
  }

  /**
   * Request camera permission and start video stream
   * @param {string|null} [deviceId=null] 
   * @returns {Promise<MediaStream|null>}
   */
  async start(deviceId = null) {
    this.stop();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = 'เบราว์เซอร์นี้ไม่รองรับการเข้าถึงกล้อง (WebRTC / getUserMedia not supported)';
      this._emitError('UNSUPPORTED', msg, new Error(msg));
      return null;
    }

    let stream = null;
    const constraints = this._buildConstraints(deviceId);

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      // Fallback: If ideal constraints failed (OverconstrainedError), try simple video: true
      if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        console.warn('[CameraManager] Constraints failed, attempting basic fallback constraints...');
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch (fallbackErr) {
          this._handleMediaError(fallbackErr);
          return null;
        }
      } else {
        this._handleMediaError(err);
        return null;
      }
    }

    if (!stream) {
      return null;
    }

    this.currentStream = stream;
    this.currentDeviceId = deviceId;
    this.video.srcObject = stream;
    this.video.setAttribute('playsinline', 'true');
    this.video.setAttribute('autoplay', 'true');
    this.video.muted = true;

    return new Promise((resolve) => {
      const onLoaded = async () => {
        this.video.removeEventListener('loadedmetadata', onLoaded);
        try {
          await this.video.play();
        } catch (playErr) {
          console.warn('[CameraManager] Autoplay was prevented, waiting for user interaction:', playErr);
        }
        this._emitReady();
        resolve(this.currentStream);
      };

      if (this.video.readyState >= 1) {
        onLoaded();
      } else {
        this.video.addEventListener('loadedmetadata', onLoaded);
      }
    });
  }

  /**
   * Handle getUserMedia error mapping
   * @private
   * @param {Error} err 
   */
  _handleMediaError(err) {
    let errorType = 'UNKNOWN';
    let userMsg = 'เกิดข้อผิดพลาดในการเปิดกล้อง';

    switch (err.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        errorType = 'PERMISSION_DENIED';
        userMsg = 'กรุณาอนุญาตการเข้าถึงกล้องในเบราว์เซอร์เพื่อใช้งานระบบนับคะแนน';
        break;
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        errorType = 'DEVICE_NOT_FOUND';
        userMsg = 'ไม่พบอุปกรณ์กล้องบนอุปกรณ์นี้';
        break;
      case 'NotReadableError':
      case 'TrackStartError':
        errorType = 'CAMERA_IN_USE';
        userMsg = 'กล้องอาจถูกใช้งานโดยโปรแกรมอื่นอยู่ กรุณาปิดโปรแกรมอื่นแล้วลองใหม่';
        break;
      case 'OverconstrainedError':
        errorType = 'OVERCONSTRAINED';
        userMsg = 'อุปกรณ์ไม่รองรับความละเอียดกล้องที่ระบุ';
        break;
      case 'SecurityError':
        errorType = 'SECURITY_ERROR';
        userMsg = 'การเข้าถึงกล้องต้องใช้งานผ่าน HTTPS หรือ localhost เท่านั้น';
        break;
      default:
        userMsg = `ไม่สามารถเปิดกล้องได้ (${err.message || err.name})`;
    }

    this._emitError(errorType, userMsg, err);
  }

  /**
   * Stop current camera stream and release hardware
   */
  stop() {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.currentStream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  /**
   * List all available video input devices
   * @returns {Promise<MediaDeviceInfo[]>}
   */
  async listDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      return videoDevices.map((device) => ({
        deviceId: device.deviceId,
        label: device.label || '',
        groupId: device.groupId,
      }));
    } catch (err) {
      console.warn('[CameraManager] Failed to enumerate devices:', err);
      return [];
    }
  }

  /**
   * Switch to a different camera device
   * @param {string} deviceId 
   * @returns {Promise<MediaStream|null>}
   */
  async switchCamera(deviceId) {
    if (this.currentDeviceId === deviceId && this.currentStream) {
      return this.currentStream;
    }
    return this.start(deviceId);
  }
}
