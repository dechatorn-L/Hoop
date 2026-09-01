/**
 * @fileoverview Unified Object Detector Module
 * Supports both Roboflow (inferencejs) and Local ONNX (onnxruntime-web) with seamless hot-swapping and auto-fallback.
 */

import { InferenceEngine, CVImage } from 'inferencejs';
import { OnnxWorkerDetector } from './onnx-worker-detector.js';

export class ObjectDetector {
  /**
   * @param {Object} [config={}] Configuration options
   * @param {number} [config.confidenceThreshold=0.35] Confidence threshold (0-1)
   * @param {number} [config.inferenceRate=25] Max inference FPS
   */
  constructor(config = {}) {
    this.config = config;
    this.confidenceThreshold = config.confidenceThreshold ?? 0.35;
    this.inferenceRate = config.inferenceRate ?? 25;

    // Providers
    this.currentProvider = 'roboflow'; // 'roboflow' | 'onnx'
    this.activeModelId = '';

    // Roboflow Engine
    this.roboflowEngine = new InferenceEngine();
    this.roboflowWorkerId = null;

    // High-Performance Dedicated Background ONNX Worker (Strategy 3)
    this.onnxDetector = new OnnxWorkerDetector({
      confidenceThreshold: this.confidenceThreshold,
      inferenceRate: this.inferenceRate,
      modelPath: config.onnxModelPath || '/models/basketball_swish_yolov8.onnx',
      poolSize: 1, // Single-worker dedicated core (leaves other 7 cores free for camera 60 FPS)
    });

    this.isLoaded = false;
    this.isLoading = false;
    this.lastInferenceTime = 0;
    this.lastDetections = [];
    this.isInferring = false;
  }

  /**
   * Load model based on provider options
   * @param {Object|string} options Options object or modelId string
   * @param {string} [apiKey] Roboflow API key (if options is string)
   * @param {boolean} [autoFallback=true] Whether to fallback to ONNX if Roboflow fails
   * @returns {Promise<{provider: string, id: string}>}
   */
  async loadModel(options, apiKey = '', autoFallback = true) {
    let provider = 'roboflow';
    let modelId = '';
    let key = apiKey;
    let onnxPath = this.config.onnxModelPath || '/models/basketball_swish_yolov8.onnx';

    if (typeof options === 'string') {
      modelId = options;
      provider = options.endsWith('.onnx') || options.includes('onnx') ? 'onnx' : 'roboflow';
    } else if (typeof options === 'object' && options !== null) {
      provider = options.provider || (options.modelPath ? 'onnx' : 'roboflow');
      modelId = options.modelId || '';
      key = options.apiKey || options.publishableKey || key;
      onnxPath = options.modelPath || onnxPath;
      if (typeof options.autoFallback === 'boolean') {
        autoFallback = options.autoFallback;
      }
    }

    this.isLoading = true;
    this.isLoaded = false;
    this.lastDetections = [];
    this.isInferring = false;
    if (this.onnxDetector) {
      this.onnxDetector.lastDetections = [];
    }

    // 1. If ONNX Provider requested
    if (provider === 'onnx') {
      try {
        console.log(`[ObjectDetector] Initializing Local ONNX model: ${onnxPath}`);
        await this.onnxDetector.loadModel(onnxPath);
        this.currentProvider = 'onnx';
        this.activeModelId = onnxPath;
        this.isLoaded = true;
        this.isLoading = false;
        return { provider: 'onnx', id: onnxPath };
      } catch (onnxErr) {
        this.isLoading = false;
        this.isLoaded = false;
        throw onnxErr;
      }
    }

    // 2. Roboflow Provider
    try {
      console.log(`[ObjectDetector] Initializing Roboflow model: ${modelId}`);
      if (!modelId || !key) {
        throw new Error('Model ID และ Publishable API Key จำเป็นสำหรับการโหลด Roboflow');
      }

      await this._loadRoboflowModel(modelId, key);
      this.currentProvider = 'roboflow';
      this.activeModelId = modelId;
      this.isLoaded = true;
      this.isLoading = false;
      return { provider: 'roboflow', id: modelId };
    } catch (rfErr) {
      console.warn('[ObjectDetector] Roboflow load failed:', rfErr);

      // Auto-fallback to Local ONNX if enabled
      if (autoFallback) {
        console.log('[ObjectDetector] Triggering auto-fallback to Local ONNX...');
        try {
          await this.onnxDetector.loadModel(onnxPath);
          this.currentProvider = 'onnx';
          this.activeModelId = onnxPath;
          this.isLoaded = true;
          this.isLoading = false;
          console.log('[ObjectDetector] Auto-fallback to Local ONNX succeeded.');
          return { provider: 'onnx', id: onnxPath, fallback: true, originalError: rfErr.message };
        } catch (fallbackErr) {
          console.error('[ObjectDetector] Auto-fallback to ONNX also failed:', fallbackErr);
        }
      }

      this.isLoading = false;
      this.isLoaded = false;
      throw rfErr;
    }
  }

  /**
   * Internal Roboflow worker loading
   * @private
   */
  async _loadRoboflowModel(modelId, apiKey) {
    // If previous worker exists, stop it cleanly first
    if (this.roboflowWorkerId) {
      const oldWorker = this.roboflowWorkerId;
      this.roboflowWorkerId = null;
      this.isInferring = false;
      try {
        await this.roboflowEngine.stopWorker(oldWorker);
      } catch {
        // Ignore cleanup errors
      }
      // Brief pause to allow worker thread disposal
      await new Promise((r) => setTimeout(r, 60));
    }

    try {
      console.log(`[ObjectDetector] Starting worker by modelId: ${modelId}`);
      this.roboflowWorkerId = await this.roboflowEngine.startWorkerByModelId(modelId, apiKey);
    } catch (err) {
      console.warn('[ObjectDetector] startWorkerByModelId failed, trying legacy startWorker:', err);
      const parts = modelId.split('/');
      const projectSlug = parts[parts.length - 2] || parts[0];
      const versionNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(versionNum)) {
        this.roboflowWorkerId = await this.roboflowEngine.startWorker(projectSlug, versionNum, apiKey);
      } else {
        throw err;
      }
    }

    console.log(`[ObjectDetector] Roboflow worker ready: ${this.roboflowWorkerId}`);
    return this.roboflowWorkerId;
  }

  /**
   * Set confidence threshold for detections
   * @param {number} threshold Value between 0 and 1
   */
  setConfidence(threshold) {
    if (typeof threshold === 'number' && !isNaN(threshold)) {
      this.confidenceThreshold = Math.max(0.01, Math.min(0.99, threshold));
      this.onnxDetector.setConfidence(this.confidenceThreshold);
    }
  }

  /**
   * Set max inference rate in frames per second
   * @param {number} fps Target FPS
   */
  setInferenceRate(fps) {
    if (typeof fps === 'number' && fps > 0) {
      this.inferenceRate = fps;
      this.onnxDetector.setInferenceRate(fps);
    }
  }

  /**
   * Check if active model is loaded and ready
   * @returns {boolean}
   */
  isReady() {
    if (!this.isLoaded) return false;
    if (this.currentProvider === 'onnx') {
      return this.onnxDetector.isReady();
    }
    return Boolean(this.roboflowWorkerId);
  }

  /**
   * Run inference on video element with FPS throttling
   * @param {HTMLVideoElement} videoElement
   * @returns {Promise<Array<{class: string, bbox: {x: number, y: number, width: number, height: number}, confidence: number}>>}
   */
  async detect(videoElement) {
    if (!this.isReady() || !videoElement || videoElement.readyState < 2) {
      return [];
    }

    // Delegate to ONNX if provider is onnx
    if (this.currentProvider === 'onnx') {
      const detections = await this.onnxDetector.detect(videoElement);
      this.lastDetections = detections;
      return detections;
    }

    // Roboflow Detection
    const now = performance.now();
    const intervalMs = 1000 / this.inferenceRate;

    // Watchdog: If inference has been pending for > 2.5s (e.g. during worker swap), force reset flag
    if (this.isInferring && now - this.lastInferenceTime > 2500) {
      console.warn('[ObjectDetector] Watchdog: Resetting stuck inference lock');
      this.isInferring = false;
    }

    if (now - this.lastInferenceTime < intervalMs || this.isInferring) {
      return this.lastDetections;
    }

    this.isInferring = true;
    this.lastInferenceTime = now;

    try {
      const cvImage = new CVImage(videoElement);
      const inferPromise = this.roboflowEngine.infer(this.roboflowWorkerId, cvImage);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Inference timeout')), 2500)
      );

      const rawPredictions = await Promise.race([inferPromise, timeoutPromise]);
      const detections = this._normalizePredictions(rawPredictions);
      this.lastDetections = detections;
      return detections;
    } catch (error) {
      console.warn('[ObjectDetector] Roboflow Inference error:', error);
      return this.lastDetections;
    } finally {
      this.isInferring = false;
    }
  }

  /**
   * Normalize Roboflow predictions to Top-Left bbox pixel format
   * @private
   */
  _normalizePredictions(rawPredictions) {
    if (!rawPredictions) {
      return [];
    }

    const list = Array.isArray(rawPredictions)
      ? rawPredictions
      : (Array.isArray(rawPredictions.predictions) ? rawPredictions.predictions : []);

    const normalized = [];

    for (const pred of list) {
      if (!pred) continue;

      let confidence = 0;
      if (typeof pred.confidence === 'number') confidence = pred.confidence;
      else if (typeof pred.score === 'number') confidence = pred.score;
      else if (typeof pred.conf === 'number') confidence = pred.conf;

      if (confidence < this.confidenceThreshold) {
        continue;
      }

      let rawClass = '';
      if (pred.class !== undefined && pred.class !== null) {
        rawClass = String(pred.class);
      } else if (pred.class_id !== undefined && pred.class_id !== null) {
        rawClass = String(pred.class_id);
      } else if (pred.classIndex !== undefined && pred.classIndex !== null) {
        rawClass = String(pred.classIndex);
      } else if (pred.label) {
        rawClass = String(pred.label);
      } else if (pred.name) {
        rawClass = String(pred.name);
      }
      rawClass = rawClass.toLowerCase().trim();

      // Normalize numeric class IDs (0 = player/person, 1 = rim, 2 = ball)
      if (rawClass === '0') rawClass = 'person';
      else if (rawClass === '1') rawClass = 'rim';
      else if (rawClass === '2') rawClass = 'ball';

      const box = pred.bbox || pred;
      const width = typeof box.width === 'number' ? box.width : 0;
      const height = typeof box.height === 'number' ? box.height : 0;

      let x = typeof box.x === 'number' ? box.x : 0;
      let y = typeof box.y === 'number' ? box.y : 0;

      let topLeftX = x;
      let topLeftY = y;

      if (typeof box.left === 'number' && typeof box.top === 'number') {
        topLeftX = box.left;
        topLeftY = box.top;
      } else if (typeof box.xmin === 'number' && typeof box.ymin === 'number') {
        topLeftX = box.xmin;
        topLeftY = box.ymin;
      } else {
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

  /**
   * Update confidence threshold across all detectors
   * @param {number} threshold Value between 0.0 and 1.0
   */
  setConfidence(threshold) {
    if (typeof threshold === 'number' && threshold >= 0 && threshold <= 1) {
      this.confidenceThreshold = threshold;
      this.onnxDetector.setConfidence(threshold);
    }
  }
}
