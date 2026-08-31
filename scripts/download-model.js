/**
 * Script to download YOLOv8n ONNX model for offline in-browser inference
 */
import fs from 'fs';
import path from 'path';
import https from 'https';

const MODEL_DIR = path.resolve('public/models');
const MODEL_PATH = path.join(MODEL_DIR, 'basketball_yolov8n.onnx');

// YOLOv8n ONNX model URL (HuggingFace SpotLab/YOLOv8Detection)
const MODEL_URL = 'https://huggingface.co/SpotLab/YOLOv8Detection/resolve/main/yolov8n.onnx';

async function downloadFile(url, dest) {
  if (!fs.existsSync(MODEL_DIR)) {
    fs.mkdirSync(MODEL_DIR, { recursive: true });
  }

  console.log(`📥 Downloading model from ${url}...`);

  return new Promise((resolve, reject) => {
    const followRedirects = (currentUrl) => {
      https.get(currentUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          console.log(`↪️ Redirecting to ${response.headers.location}...`);
          return followRedirects(response.headers.location);
        }

        if (response.statusCode !== 200) {
          return reject(new Error(`Failed to download model: HTTP ${response.statusCode}`));
        }

        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;
        const fileStream = fs.createWriteStream(dest);

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (totalBytes > 0) {
            const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
            process.stdout.write(`\rProgress: ${percent}% (${(downloadedBytes / (1024 * 1024)).toFixed(2)} MB)`);
          }
        });

        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`\n✅ Model downloaded successfully to ${dest}`);
          resolve(true);
        });

        fileStream.on('error', (err) => {
          fs.unlinkSync(dest);
          reject(err);
        });
      }).on('error', (err) => {
        reject(err);
      });
    };

    followRedirects(url);
  });
}

downloadFile(MODEL_URL, MODEL_PATH)
  .then(() => {
    console.log('🎉 Offline model ready in public/models/basketball_yolov8n.onnx');
  })
  .catch((err) => {
    console.error('❌ Error downloading model:', err.message);
    process.exit(1);
  });
