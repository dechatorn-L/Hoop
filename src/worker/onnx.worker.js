/**
 * @fileoverview Dedicated ONNX Inference Web Worker
 * Offloads ONNX tensor generation, execution, and NMS postprocessing off the main UI thread.
 */

import * as ort from 'onnxruntime-web';

// Configure WebAssembly paths & environment for worker context
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.29.0/dist/';
const cpuCores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;
ort.env.wasm.numThreads = cpuCores >= 4 ? 2 : 1; // 2 threads on 4+ core mobile devices (e.g. Snapdragon 8 Gen 2), safe 1 thread fallback
ort.env.wasm.simd = true;

const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light',
  'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
  'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
  'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard',
  'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
  'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone',
  'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear',
  'hair drier', 'toothbrush'
];

let session = null;
let modelPath = '';
let inputSize = 640;
let confidenceThreshold = 0.35;
let iouThreshold = 0.25;

// Offscreen canvas in Worker for fast GPU-to-texture rendering
let offscreenCanvas = null;
let ctx = null;

function initCanvas(size) {
  inputSize = size;
  if (typeof OffscreenCanvas !== 'undefined') {
    offscreenCanvas = new OffscreenCanvas(inputSize, inputSize);
    ctx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
  }
}

initCanvas(640);

self.onmessage = async (e) => {
  const { type, data, id } = e.data;

  switch (type) {
    case 'SET_THREADS':
      if (data && typeof data.numThreads === 'number') {
        ort.env.wasm.numThreads = data.numThreads;
        console.log(`[ONNX Worker] WASM numThreads set to: ${ort.env.wasm.numThreads}`);
        self.postMessage({ type: 'THREADS_SET', numThreads: ort.env.wasm.numThreads });
      }
      break;

    case 'INIT_MODEL':
      try {
        modelPath = data.modelPath || '/models/basketball_swish_yolov8.onnx';
        confidenceThreshold = data.confidenceThreshold ?? confidenceThreshold;
        if (data.numThreads && typeof data.numThreads === 'number') {
          ort.env.wasm.numThreads = data.numThreads;
        }
        
        console.log(`[ONNX Worker] Loading session (threads=${ort.env.wasm.numThreads}): ${modelPath}`);
        
        // Attempt WebGPU first, then WASM
        try {
          session = await ort.InferenceSession.create(modelPath, {
            executionProviders: ['webgpu', 'wasm'],
            graphOptimizationLevel: 'all',
          });
        } catch (gpuErr) {
          console.warn('[ONNX Worker] WebGPU unavailable, using WASM:', gpuErr);
          session = await ort.InferenceSession.create(modelPath, {
            executionProviders: ['wasm'],
            graphOptimizationLevel: 'all',
          });
        }

        // Dynamically detect model input resolution (e.g. 384x384 vs 640x640)
        let detectedSize = 640;
        if (session && session.inputNames && session.inputNames.length > 0) {
          const inputMeta = session.inputMetadata ? session.inputMetadata[session.inputNames[0]] : null;
          const dims = inputMeta?.dimensions;
          if (dims && dims[2] && typeof dims[2] === 'number' && dims[2] > 0) {
            detectedSize = dims[2];
          } else if (modelPath.includes('384')) {
            detectedSize = 384;
          }
        }
        initCanvas(detectedSize);
        console.log(`[ONNX Worker] Initialized model with inputSize: ${detectedSize}x${detectedSize}`);

        self.postMessage({ type: 'INIT_SUCCESS', id, modelPath, inputSize: detectedSize });
      } catch (err) {
        console.error('[ONNX Worker] Session load failed:', err);
        self.postMessage({ type: 'INIT_ERROR', id, error: err.message });
      }
      break;

    case 'SET_CONFIDENCE':
      if (typeof data.confidenceThreshold === 'number') {
        confidenceThreshold = data.confidenceThreshold;
      }
      break;

    case 'INFER_FRAME':
      if (!session || !data.imageBitmap) {
        if (data.imageBitmap) data.imageBitmap.close();
        self.postMessage({ type: 'INFER_RESULT', id, detections: [] });
        return;
      }

      const startTime = performance.now();
      const { imageBitmap, originalWidth, originalHeight } = data;

      try {
        const detections = await runInference(imageBitmap, originalWidth, originalHeight);
        const inferenceTimeMs = Math.round(performance.now() - startTime);

        self.postMessage({
          type: 'INFER_RESULT',
          id,
          detections,
          inferenceTimeMs,
        });
      } catch (inferErr) {
        console.warn('[ONNX Worker] Inference error:', inferErr);
        self.postMessage({ type: 'INFER_RESULT', id, detections: [], error: inferErr.message });
      } finally {
        // Free transfer bitmap memory immediately
        if (imageBitmap && typeof imageBitmap.close === 'function') {
          imageBitmap.close();
        }
      }
      break;
  }
};

/**
 * Execute preprocessing, ONNX run, and letterbox inverse
 */
async function runInference(imageBitmap, originalWidth, originalHeight) {
  if (!ctx) return [];

  const scale = Math.min(inputSize / originalWidth, inputSize / originalHeight);
  const newW = Math.round(originalWidth * scale);
  const newH = Math.round(originalHeight * scale);
  const padX = (inputSize - newW) >> 1;
  const padY = (inputSize - newH) >> 1;

  // 1. Draw with Neutral Gray Padding
  ctx.fillStyle = '#727272';
  ctx.fillRect(0, 0, inputSize, inputSize);
  ctx.drawImage(imageBitmap, padX, padY, newW, newH);

  // 2. Extract Pixels & Normalize to Float32 Tensor
  const { data } = ctx.getImageData(0, 0, inputSize, inputSize);
  const numPixels = inputSize * inputSize;
  const floatArray = new Float32Array(3 * numPixels);
  const inv255 = 1.0 / 255.0;

  const offsetG = numPixels;
  const offsetB = numPixels << 1;

  for (let i = 0, p = 0; i < numPixels; i++, p += 4) {
    floatArray[i] = data[p] * inv255;
    floatArray[offsetG + i] = data[p + 1] * inv255;
    floatArray[offsetB + i] = data[p + 2] * inv255;
  }

  const tensor = new ort.Tensor('float32', floatArray, [1, 3, inputSize, inputSize]);

  // 3. Session Run
  const feeds = { [session.inputNames[0]]: tensor };
  const results = await session.run(feeds);
  const outputTensor = results[session.outputNames[0]];

  // 4. Postprocess & NMS
  const candidates = postprocessTensor(outputTensor, originalWidth, originalHeight, scale, padX, padY);
  return applyNMS(candidates);
}

/**
 * Postprocess raw YOLO output tensor
 */
function postprocessTensor(outputTensor, originalWidth, originalHeight, scale, padX, padY) {
  if (!outputTensor || !outputTensor.data) return [];

  const data = outputTensor.data;
  const dims = outputTensor.dims;

  let numChannels = 0;
  let numBoxes = 0;
  let isTransposed = false;

  if (dims.length === 3) {
    if (dims[1] < dims[2]) {
      numChannels = dims[1];
      numBoxes = dims[2];
      isTransposed = false;
    } else {
      numBoxes = dims[1];
      numChannels = dims[2];
      isTransposed = true;
    }
  } else {
    return [];
  }

  const numClasses = numChannels - 4;
  const candidates = [];
  const maxBoxWidth = originalWidth * 0.75;
  const maxBoxHeight = originalHeight * 0.75;

  for (let i = 0; i < numBoxes; i++) {
    let cx, cy, w, h;
    if (!isTransposed) {
      cx = data[0 * numBoxes + i];
      cy = data[1 * numBoxes + i];
      w = data[2 * numBoxes + i];
      h = data[3 * numBoxes + i];
    } else {
      const offset = i * numChannels;
      cx = data[offset];
      cy = data[offset + 1];
      w = data[offset + 2];
      h = data[offset + 3];
    }

    let maxScore = 0;
    let classId = -1;

    for (let c = 0; c < numClasses; c++) {
      const score = !isTransposed
        ? data[(4 + c) * numBoxes + i]
        : data[i * numChannels + 4 + c];

      if (score > maxScore) {
        maxScore = score;
        classId = c;
      }
    }

    if (maxScore >= confidenceThreshold && classId >= 0) {
      const x = (cx - w / 2 - padX) / scale;
      const y = (cy - h / 2 - padY) / scale;
      const boxWidth = w / scale;
      const boxHeight = h / scale;

      if (boxWidth > maxBoxWidth || boxHeight > maxBoxHeight || boxWidth < 10 || boxHeight < 10) {
        continue;
      }

      let className = '';
      if (numClasses === 80) {
        className = COCO_CLASSES[classId] || `class_${classId}`;
        if (className === 'sports ball') className = 'ball';
      } else if (numClasses === 12) {
        if (classId <= 3) className = 'ball';
        else if (classId === 11) className = 'rim';
        else if (classId >= 5 && classId <= 9) className = 'person';
        else className = `class_${classId}`;
      } else if (numClasses === 3) {
        if (classId === 0) className = 'ball';
        else if (classId === 1) className = 'rim';
        else if (classId === 2) className = (modelPath.includes('world')) ? 'person' : 'ball';
        else className = `class_${classId}`;
      } else {
        if (classId === 0) className = 'ball';
        else if (classId === 1) className = 'rim';
        else className = `class_${classId}`;
      }

      candidates.push({
        bbox: {
          x: Math.max(0, Math.round(x)),
          y: Math.max(0, Math.round(y)),
          width: Math.round(boxWidth),
          height: Math.round(boxHeight),
        },
        class: className,
        confidence: Math.round(maxScore * 100) / 100,
      });
    }
  }

  return candidates;
}

/**
 * Apply NMS and Containment Filtering
 */
function applyNMS(boxes) {
  if (boxes.length <= 1) return boxes;

  boxes.sort((a, b) => b.confidence - a.confidence);

  const selected = [];
  const isSuppressed = new Array(boxes.length).fill(false);

  for (let i = 0; i < boxes.length; i++) {
    if (isSuppressed[i]) continue;
    const current = boxes[i];
    selected.push(current);

    for (let j = i + 1; j < boxes.length; j++) {
      if (isSuppressed[j]) continue;
      const candidate = boxes[j];

      if (current.class === candidate.class) {
        const iou = computeIoU(current.bbox, candidate.bbox);
        const containment = computeContainment(current.bbox, candidate.bbox);

        if (iou > iouThreshold || containment > 0.35) {
          isSuppressed[j] = true;
        }
      }
    }
  }

  return selected;
}

function computeIoU(b1, b2) {
  const x1 = Math.max(b1.x, b2.x);
  const y1 = Math.max(b1.y, b2.y);
  const x2 = Math.min(b1.x + b1.width, b2.x + b2.width);
  const y2 = Math.min(b1.y + b1.height, b2.y + b2.height);

  const interW = Math.max(0, x2 - x1);
  const interH = Math.max(0, y2 - y1);
  const interArea = interW * interH;
  if (interArea <= 0) return 0;

  const area1 = b1.width * b1.height;
  const area2 = b2.width * b2.height;
  return interArea / (area1 + area2 - interArea);
}

function computeContainment(b1, b2) {
  const x1 = Math.max(b1.x, b2.x);
  const y1 = Math.max(b1.y, b2.y);
  const x2 = Math.min(b1.x + b1.width, b2.x + b2.width);
  const y2 = Math.min(b1.y + b1.height, b2.y + b2.height);

  const interW = Math.max(0, x2 - x1);
  const interH = Math.max(0, y2 - y1);
  const interArea = interW * interH;
  if (interArea <= 0) return 0;

  const minArea = Math.min(b1.width * b1.height, b2.width * b2.height);
  return interArea / minArea;
}
