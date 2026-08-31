/**
 * @fileoverview Object Detector Module (Roboflow inferencejs)
 * Implements client-side object detection running in Web Worker.
 */

import { InferenceEngine, CVImage } from 'inferencejs';

export class ObjectDetector {
  /**
   * @param {Object} [config={}] Configuration options
   * @param {number} [config.confidenceThreshold=0.5] Confidence threshold (0-1)
   * @param {number} [config.inferenceRate=15] Max inference FPS
   */
  constructor(config = {}) {
    this.config = config;
    this.engine = new InferenceEngine();
    this.workerId = null;
    this.isLoaded = false;
    this.isLoading = false;
    this.confidenceThreshold = config.confidenceThreshold ?? 0.5;
    this.inferenceRate = config.inferenceRate ?? 15;
    this.lastInferenceTime = 0;
    this.lastDetections = [];
    this.isInferring = false;
  }

  /**
   * Load model from Roboflow Universe or Workspace
   * @param {string} modelId Model ID (e.g. 'people_basketball_hoops/4' or 'project/1')
   * @param {string} apiKey Roboflow Publishable API Key
   * @returns {Promise<string>} Worker ID
   */
  async loadModel(modelId, apiKey) {
    if (!modelId || !apiKey) {
      throw new Error('Model ID and Publishable API Key are required.');
    }

    this.isLoading = true;
    this.isLoaded = false;

    try {
      console.log(`[ObjectDetector] Loading model: ${modelId}...`);

      // If previous worker exists, stop it first
      if (this.workerId) {
        try {
          await this.engine.stopWorker(this.workerId);
        } catch {
          // Ignore cleanup errors
        }
        this.workerId = null;
      }

      // Determine if modelId is a project/version format (e.g. 'people_basketball_hoops/4')
      const parts = modelId.split('/');
      const isProjectVersion = parts.length === 2 && !isNaN(parseInt(parts[1], 10));

      if (isProjectVersion) {
        const projectSlug = parts[0];
        const versionNum = parseInt(parts[1], 10);
        try {
          this.workerId = await this.engine.startWorker(projectSlug, versionNum, apiKey);
        } catch (err) {
          console.warn('[ObjectDetector] startWorker failed, trying startWorkerByModelId:', err);
          this.workerId = await this.engine.startWorkerByModelId(modelId, apiKey);
        }
      } else {
        try {
          this.workerId = await this.engine.startWorkerByModelId(modelId, apiKey);
        } catch (err) {
          console.warn('[ObjectDetector] startWorkerByModelId failed, trying startWorker:', err);
          const projectSlug = parts[parts.length - 2];
          const versionNum = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(versionNum)) {
            this.workerId = await this.engine.startWorker(projectSlug, versionNum, apiKey);
          } else {
            throw err;
          }
        }
      }

      this.isLoaded = true;
      this.isLoading = false;
      console.log(`[ObjectDetector] Model loaded successfully with workerId: ${this.workerId}`);
      return this.workerId;
    } catch (error) {
      this.isLoaded = false;
      this.isLoading = false;
      this.workerId = null;
      console.error('[ObjectDetector] Failed to load model:', error);
      let errorDetail = error.message || error;
      if (typeof errorDetail === 'string' && errorDetail.includes('Model initialization failed')) {
        if (!apiKey.startsWith('rf_')) {
          errorDetail = 'API Key ไม่ถูกต้อง — inferencejs ต้องการ "Publishable API Key" (ขึ้นต้นด้วย rf_...) จาก Roboflow Workspace Settings (ไม่ใช่ Private Key)';
        }
      }
      throw new Error(`Failed to load Roboflow model (${modelId}): ${errorDetail}`);
    }
  }

  /**
   * Set confidence threshold for detections
   * @param {number} threshold Value between 0 and 1
   */
  setConfidence(threshold) {
    if (typeof threshold === 'number' && !isNaN(threshold)) {
      this.confidenceThreshold = Math.max(0.01, Math.min(0.99, threshold));
    }
  }

  /**
   * Set max inference rate in frames per second
   * @param {number} fps Target FPS (e.g. 10-15)
   */
  setInferenceRate(fps) {
    if (typeof fps === 'number' && fps > 0) {
      this.inferenceRate = fps;
    }
  }

  /**
   * Check if model is loaded and ready for inference
   * @returns {boolean}
   */
  isReady() {
    return Boolean(this.isLoaded && this.workerId);
  }

  /**
   * Run inference on video element with FPS throttling
   * @param {HTMLVideoElement} videoElement
   * @returns {Promise<Array<{class: string, bbox: {x: number, y: number, width: number, height: number}, confidence: number}>>}
   */
  async detect(videoElement) {
    if (!this.isReady() || !videoElement || videoElement.readyState < 2) {
      return this.lastDetections;
    }

    const now = performance.now();
    const intervalMs = 1000 / this.inferenceRate;

    // Throttle inference: return cached detections if called too quickly or still inferring
    if (now - this.lastInferenceTime < intervalMs || this.isInferring) {
      return this.lastDetections;
    }

    this.isInferring = true;
    this.lastInferenceTime = now;

    try {
      const cvImage = new CVImage(videoElement);
      const rawPredictions = await this.engine.infer(this.workerId, cvImage);
      const detections = this._normalizePredictions(rawPredictions);
      this.lastDetections = detections;
      if (detections.length > 0) {
        console.log('[ObjectDetector] Detections found:', detections);
      }
      return detections;
    } catch (error) {
      console.warn('[ObjectDetector] Inference error:', error);
      return this.lastDetections;
    } finally {
      this.isInferring = false;
    }
  }

  /**
   * Normalize predictions to Top-Left bbox pixel format and apply confidence filter
   * Output format: [{ class: string, bbox: { x, y, width, height }, confidence: number }]
   * @private
   */
  _normalizePredictions(rawPredictions) {
    if (!rawPredictions) {
      return [];
    }

    // Handle different return shapes from inferencejs (array or { predictions: [...] })
    const list = Array.isArray(rawPredictions)
      ? rawPredictions
      : (Array.isArray(rawPredictions.predictions) ? rawPredictions.predictions : []);

    const normalized = [];

    for (const pred of list) {
      if (!pred) continue;

      const confidence = typeof pred.confidence === 'number'
        ? pred.confidence
        : (typeof pred.score === 'number' ? pred.score : 0);

      // Filter by confidence threshold
      if (confidence < this.confidenceThreshold) {
        continue;
      }

      // Extract class name
      const rawClass = (pred.class || pred.label || pred.name || '').toLowerCase().trim();

      // Extract box coordinates
      const box = pred.bbox || pred;
      const width = typeof box.width === 'number' ? box.width : 0;
      const height = typeof box.height === 'number' ? box.height : 0;

      let x = typeof box.x === 'number' ? box.x : 0;
      let y = typeof box.y === 'number' ? box.y : 0;

      // Roboflow default returns center (x, y) coordinates.
      // Convert center (x, y) to Top-Left (x, y) format if left/top or xmin/ymin are not explicitly given.
      let topLeftX = x;
      let topLeftY = y;

      if (typeof box.left === 'number' && typeof box.top === 'number') {
        topLeftX = box.left;
        topLeftY = box.top;
      } else if (typeof box.xmin === 'number' && typeof box.ymin === 'number') {
        topLeftX = box.xmin;
        topLeftY = box.ymin;
      } else {
        // Center coordinates -> convert to Top-Left
        topLeftX = x - width / 2;
        topLeftY = y - height / 2;
      }

      normalized.push({
        class: rawClass,
        bbox: {
          x: Math.round(topLeftX),
          y: Math.round(topLeftY),
          width: Math.round(width),
          height: Math.round(height),
        },
        confidence: Math.round(confidence * 100) / 100,
      });
    }

    return normalized;
  }
}
