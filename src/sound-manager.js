/**
 * @fileoverview Sound Manager using Web Audio API
 * Handles low-latency audio playback, built-in sound loading, custom uploads, and volume control.
 */

import { userError } from './i18n.js';

export class SoundManager {
  /**
   * @param {Object} [config={}] Configuration options
   * @param {string} [config.defaultSound='cha-ching'] Default sound ID
   * @param {number} [config.volume=0.8] Master volume (0.0 to 1.0)
   */
  constructor(config = {}) {
    this.config = config;
    this.audioCtx = null;
    this.gainNode = null;
    this.sounds = new Map(); // id -> { id, name, buffer, isCustom }
    this.activeSoundId = config.defaultSound || 'cha-ching';
    this.volume = config.volume ?? 0.8;
    this.isInitialized = false;
    this.builtinSoundList = [
      { id: 'cha-ching', name: 'Cha-Ching (Cash 💰)', path: new URL('../sounds/cha-ching.wav', import.meta.url).href },
      { id: 'swish', name: 'Swish (Net 🏀)', path: new URL('../sounds/swish.wav', import.meta.url).href },
      { id: 'net-nba', name: 'NBA Net (Snap 🎯)', path: new URL('../sounds/net-nba.wav', import.meta.url).href },
      { id: 'coin', name: 'Coin (8-bit 🪙)', path: new URL('../sounds/coin.wav', import.meta.url).href },
      { id: 'ding', name: 'Ding (Bell 🔔)', path: new URL('../sounds/ding.wav', import.meta.url).href },
      { id: 'point', name: 'Point (Score ⚡)', path: new URL('../sounds/point.wav', import.meta.url).href },
      { id: 'levelup', name: 'Level Up (Fanfare 🎺)', path: new URL('../sounds/levelup.wav', import.meta.url).href },
      { id: 'powerup', name: 'Power Up (Retro 🍄)', path: new URL('../sounds/powerup.wav', import.meta.url).href },
      { id: 'jingle', name: 'Jingle (Victory 🎉)', path: new URL('../sounds/jingle.wav', import.meta.url).href },
      { id: 'curry-bang', name: 'Curry BANG! 💥', path: new URL('../sounds/curry-bang.wav', import.meta.url).href },
      { id: 'curry-downtown-bang', name: 'Curry Downtown BANG! 🎯', path: new URL('../sounds/curry-downtown-bang.wav', import.meta.url).href },
      { id: 'boomshakalaka', name: 'Boomshakalaka! 🔥', path: new URL('../sounds/boomshakalaka.wav', import.meta.url).href },
      { id: 'hes-on-fire', name: "He's on Fire! 🔥", path: new URL('../sounds/hes-on-fire.wav', import.meta.url).href },
      { id: 'from-downtown', name: 'From Downtown! 🎯', path: new URL('../sounds/from-downtown.wav', import.meta.url).href },
      { id: 'kobe', name: 'Kobe! 🐍', path: new URL('../sounds/kobe.wav', import.meta.url).href },
      { id: 'buzzer-nba', name: 'NBA Buzzer ⏰', path: new URL('../sounds/buzzer-nba.wav', import.meta.url).href },
      { id: 'triple-airhorn', name: 'Triple Airhorn 📢', path: new URL('../sounds/triple-airhorn.wav', import.meta.url).href },
      { id: 'crowd-ohhh', name: 'Crowd OHHH! 😲', path: new URL('../sounds/crowd-ohhh.wav', import.meta.url).href },
      { id: 'csgo-headshot', name: 'CS:GO Headshot 🎯', path: new URL('../sounds/csgo-headshot.wav', import.meta.url).href },
      { id: 'sonic-ring', name: 'Sonic Ring 💍', path: new URL('../sounds/sonic-ring.wav', import.meta.url).href },
      { id: 'street-fighter-ko', name: 'Street Fighter K.O. 🥊', path: new URL('../sounds/street-fighter-ko.wav', import.meta.url).href },
      { id: 'fatality', name: 'Mortal Kombat Fatality 💀', path: new URL('../sounds/fatality.wav', import.meta.url).href },
      { id: 'anime-wow', name: 'Anime WOW! ✨', path: new URL('../sounds/anime-wow.wav', import.meta.url).href },
      { id: 'sheesh', name: 'Sheeeesh! 🥶', path: new URL('../sounds/sheesh.wav', import.meta.url).href },
      { id: 'fahhhh', name: 'Fahhhh (Sound FX 💨)', path: new URL('../sounds/fahhhh.wav', import.meta.url).href },
      { id: 'green-giant', name: 'Green Giant (Ho Ho Ho 🎅)', path: new URL('../sounds/green-giant.wav', import.meta.url).href },
    ];
  }

  /**
   * Initialize AudioContext and preload sound effects
   */
  async init() {
    if (this.isInitialized && this.audioCtx) {
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('[SoundManager] Web Audio API is not supported in this browser.');
      return;
    }

    this.audioCtx = new AudioContextClass({ latencyHint: 'interactive' });
    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    this.gainNode.connect(this.audioCtx.destination);

    // Setup auto-resume on first user interaction
    this._setupUserInteractionResume();

    // Preload built-in sounds
    await this.loadBuiltinSounds();

    this.isInitialized = true;
    console.log('[SoundManager] SoundManager initialized successfully.');
  }

  /**
   * Resume AudioContext if suspended (browser autoplay policy)
   * @private
   */
  _setupUserInteractionResume() {
    const resumeAudio = async () => {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        try {
          await this.audioCtx.resume();
          console.log('[SoundManager] AudioContext resumed by user interaction.');
        } catch (err) {
          console.warn('[SoundManager] Failed to resume AudioContext:', err);
        }
      }
    };

    ['click', 'touchstart', 'keydown'].forEach((eventName) => {
      window.addEventListener(eventName, resumeAudio, { once: true, passive: true });
    });
  }

  /**
   * Preload and decode all built-in sound effects
   */
  async loadBuiltinSounds() {
    for (const item of this.builtinSoundList) {
      try {
        const response = await fetch(item.path);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} when fetching ${item.path}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
        this.sounds.set(item.id, {
          id: item.id,
          name: item.name,
          buffer: audioBuffer,
          isCustom: false,
        });
        console.log(`[SoundManager] Loaded sound: ${item.id}`);
      } catch (error) {
        console.warn(`[SoundManager] Failed to load sound ${item.id} from file, generating synthetic fallback:`, error);
        const fallbackBuffer = this._generateSyntheticSound(item.id);
        if (fallbackBuffer) {
          this.sounds.set(item.id, {
            id: item.id,
            name: item.name,
            buffer: fallbackBuffer,
            isCustom: false,
          });
        }
      }
    }
  }

  /**
   * Load a custom sound file (e.g. from file input)
   * @param {File} file Audio file (.mp3, .wav, .ogg)
   * @returns {Promise<string>} Sound ID
   */
  async loadCustomSound(file) {
    if (!file) {
      throw userError('noAudioFile');
    }

    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw userError('audioTooLarge', { size: (file.size / (1024 * 1024)).toFixed(1) });
    }

    if (!this.audioCtx) {
      await this.init();
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);

      const customId = `custom-${Date.now()}`;
      const soundObj = {
        id: customId,
        name: file.name.replace(/\.[^/.]+$/, ''),
        buffer: audioBuffer,
        isCustom: true,
      };

      this.sounds.set(customId, soundObj);
      this.setActiveSound(customId);
      console.log(`[SoundManager] Custom sound uploaded and activated: ${soundObj.name} (${customId})`);
      return customId;
    } catch (error) {
      console.error('[SoundManager] Failed to decode custom audio file:', error);
      throw userError('audioDecodeError', { detail: error.message || String(error) });
    }
  }

  /**
   * Play the currently selected score sound effect
   */
  playScoreSound() {
    if (!this.audioCtx) {
      return;
    }

    // Auto resume if still suspended
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    let sound = null;
    if (this.activeSoundId === 'random') {
      const soundList = Array.from(this.sounds.values()).filter((s) => s && s.buffer);
      if (soundList.length > 0) {
        const randomIndex = Math.floor(Math.random() * soundList.length);
        sound = soundList[randomIndex];
      }
    } else {
      sound = this.sounds.get(this.activeSoundId) || this.sounds.get('cha-ching') || this.sounds.values().next().value;
    }

    if (!sound || !sound.buffer) {
      console.warn(`[SoundManager] Sound buffer for '${this.activeSoundId}' not ready.`);
      return;
    }

    try {
      const source = this.audioCtx.createBufferSource();
      source.buffer = sound.buffer;
      source.connect(this.gainNode);
      source.onended = () => {
        try { source.disconnect(); } catch (_) {}
      };
      source.start(0);
    } catch (error) {
      console.warn('[SoundManager] Error playing sound:', error);
    }
  }

  /**
   * Set active sound ID (or 'random' to shuffle on every made basket)
   * @param {string} soundId 
   */
  setActiveSound(soundId) {
    if (soundId === 'random' || this.sounds.has(soundId)) {
      this.activeSoundId = soundId;
      console.log(`[SoundManager] Active sound set to: ${soundId}`);
    } else {
      console.warn(`[SoundManager] Sound ID '${soundId}' not found.`);
    }
  }

  /**
   * Set master volume (0.0 to 1.0)
   * @param {number} level 
   */
  setVolume(level) {
    if (typeof level === 'number' && !isNaN(level)) {
      this.volume = Math.max(0, Math.min(1, level));
      if (this.gainNode && this.audioCtx) {
        this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
      }
    }
  }

  /**
   * Get all registered sounds (built-in + custom)
   * @returns {Array<{id: string, name: string, isCustom: boolean}>}
   */
  getAvailableSounds() {
    return Array.from(this.sounds.values()).map((s) => ({
      id: s.id,
      name: s.name,
      isCustom: !!s.isCustom,
    }));
  }

  /**
   * Generate in-memory synthetic fallback audio buffer
   * @private
   */
  _generateSyntheticSound(type) {
    if (!this.audioCtx) return null;
    const sampleRate = this.audioCtx.sampleRate;

    if (type === 'swoosh' || type === 'fahhhh' || type === 'swish' || type === 'net-nba') {
      const duration = 0.4;
      const buffer = this.audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const env = Math.sin((t / duration) * Math.PI) * Math.exp(-t * 4);
        data[i] = (Math.random() * 2 - 1) * env * 0.8;
      }
      return buffer;
    } else if (type === 'coin' || type === 'ding' || type === 'point' || type === 'sonic-ring' || type === 'csgo-headshot') {
      const duration = 0.5;
      const buffer = this.audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
      const data = buffer.getChannelData(0);
      const freq = type === 'coin' || type === 'sonic-ring' ? 987.77 : (type === 'point' ? 880 : 1200);
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 7);
        data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.7;
      }
      return buffer;
    } else if (type === 'levelup' || type === 'powerup' || type === 'jingle') {
      const duration = 0.6;
      const buffer = this.audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
      const data = buffer.getChannelData(0);
      const baseFreq = type === 'levelup' ? 440 : (type === 'powerup' ? 330 : 523.25);
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const stage = Math.floor(t * 5);
        const freq = baseFreq * Math.pow(1.25, stage);
        const env = Math.exp(-(t % 0.12) * 10) * Math.max(0, 1 - t / duration);
        data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.7;
      }
      return buffer;
    } else if (type === 'buzzer' || type === 'cha-ching' || type === 'buzzer-nba' || type === 'triple-airhorn') {
      const duration = 0.6;
      const buffer = this.audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const env = t < 0.05 ? t / 0.05 : 1 - (t - 0.05) / 0.55;
        const s1 = Math.sign(Math.sin(2 * Math.PI * 220 * t));
        const s2 = Math.sign(Math.sin(2 * Math.PI * 233 * t));
        data[i] = (s1 * 0.5 + s2 * 0.5) * env * 0.6;
      }
      return buffer;
    } else if (type === 'curry-bang' || type === 'curry-downtown-bang') {
      const duration = 1.0;
      const buffer = this.audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const t1 = t;
        const t2 = t - 0.4;
        const env1 = t1 >= 0 && t1 < 0.35 ? Math.exp(-t1 * 12) : 0;
        const env2 = t2 >= 0 && t2 < 0.5 ? Math.exp(-t2 * 8) : 0;
        const s1 = (Math.random() * 2 - 1) * 0.4 + Math.sin(2 * Math.PI * 320 * t) * 0.6;
        const s2 = (Math.random() * 2 - 1) * 0.4 + Math.sin(2 * Math.PI * 400 * t) * 0.6;
        data[i] = (s1 * env1 + s2 * env2) * 0.8;
      }
      return buffer;
    } else if (type === 'crowd-cheer' || type === 'green-giant' || type === 'crowd-ohhh') {
      const duration = 1.5;
      const buffer = this.audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
      const data = buffer.getChannelData(0);
      let lp = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const env = t < 0.3 ? t / 0.3 : Math.exp(-(t - 0.3) * 1.2);
        const noise = Math.random() * 2 - 1;
        lp = lp + 0.15 * (noise - lp);
        data[i] = lp * env * 0.9;
      }
      return buffer;
    }
    const duration = 0.3;
    const buffer = this.audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      data[i] = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 6) * 0.5;
    }
    return buffer;
  }
}
