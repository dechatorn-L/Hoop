/**
 * Generates 16-bit 44.1kHz PCM WAV audio files for built-in sound effects.
 */

import fs from 'fs';
import path from 'path';

const SAMPLE_RATE = 44100;

function createWavHeader(dataLength, sampleRate = 44100, numChannels = 1, bitsPerSample = 16) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const buffer = Buffer.alloc(44);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);

  return buffer;
}

function writeAudioFile(filePath, samples) {
  const numSamples = samples.length;
  const dataLength = numSamples * 2;
  const header = createWavHeader(dataLength, SAMPLE_RATE, 1, 16);
  const dataBuffer = Buffer.alloc(dataLength);

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intSample = s < 0 ? s * 0x8000 : s * 0x7FFF;
    dataBuffer.writeInt16LE(Math.floor(intSample), i * 2);
  }

  const fullBuffer = Buffer.concat([header, dataBuffer]);
  fs.writeFileSync(filePath, fullBuffer);
  console.log(`Generated: ${filePath} (${(fullBuffer.length / 1024).toFixed(1)} KB)`);
}

// 1. Basketball Swish / Swoosh (Noise sweep with soft resonance)
function generateSwoosh() {
  const duration = 0.45;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  let b0 = 0, b1 = 0, b2 = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.sin((t / duration) * Math.PI) * Math.exp(-t * 3.5);
    const whiteNoise = (Math.random() * 2 - 1);

    // Dynamic bandpass filtering simulating net friction
    const centerFreq = 1200 + Math.sin(t * 12) * 600;
    const q = 3.0;
    const w0 = (2 * Math.PI * centerFreq) / SAMPLE_RATE;
    const alpha = Math.sin(w0) / (2 * q);

    b0 = alpha * whiteNoise;
    const sample = (b0 + (Math.random() * 0.2 - 0.1)) * env * 1.5;
    samples[i] = sample;
  }
  return samples;
}

// 2. Shot Clock Buzzer (Dual square wave buzzer tone)
function generateBuzzer() {
  const duration = 0.75;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  const freq1 = 220; // A3
  const freq2 = 233.08; // Bb3 (dissonant horn beat)
  const freq3 = 110; // Sub-bass

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    // Envelope: quick attack, sustained, fast release
    let env = 1.0;
    if (t < 0.02) env = t / 0.02;
    else if (t > duration - 0.05) env = (duration - t) / 0.05;

    // Harmonic rich buzzer waveforms
    const s1 = Math.sign(Math.sin(2 * Math.PI * freq1 * t));
    const s2 = Math.sign(Math.sin(2 * Math.PI * freq2 * t));
    const s3 = Math.sin(2 * Math.PI * freq3 * t);
    const buzz = (s1 * 0.4 + s2 * 0.4 + s3 * 0.2) * env * 0.7;
    samples[i] = buzz;
  }
  return samples;
}

// 3. Crowd Cheer (Layered cheering atmosphere with clapping bursts)
function generateCrowdCheer() {
  const duration = 1.6;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  let lp = 0;
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    // Envelope: swell up and slow decay
    let env = 0;
    if (t < 0.3) env = Math.pow(t / 0.3, 1.5);
    else env = Math.exp(-(t - 0.3) * 1.2);

    const noise = (Math.random() * 2 - 1);
    // Lowpass filter for crowd roar
    lp = lp + 0.15 * (noise - lp);

    // Periodic clapping impulse
    const clapEnv = Math.sin(t * 30) > 0.85 ? 0.3 * (Math.random() * 2 - 1) : 0;

    // High frequency excitement
    const highNoise = (Math.random() * 2 - 1) * 0.2;

    samples[i] = (lp * 0.7 + highNoise + clapEnv) * env * 1.2;
  }
  return samples;
}

const soundsDir = path.resolve('sounds');
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

writeAudioFile(path.join(soundsDir, 'swoosh.mp3'), generateSwoosh());
writeAudioFile(path.join(soundsDir, 'buzzer.mp3'), generateBuzzer());
writeAudioFile(path.join(soundsDir, 'crowd-cheer.mp3'), generateCrowdCheer());
console.log('All sound files generated successfully!');
