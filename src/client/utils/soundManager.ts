import { AudioSettings, FishRarity } from '../../shared/types.js';
import { getBackendBaseUrl } from '../apiConfig.js';

// Pleasant Chill Lofi / Kalimba chord progression (Fmaj7 -> Em7 -> Dm7 -> Cmaj7)
const CHILL_CHORDS: number[][] = [
  [349.23, 440.0, 523.25, 659.25], // Fmaj7 (F4, A4, C5, E5)
  [329.63, 392.0, 493.88, 587.33], // Em7   (E4, G4, B4, D5)
  [293.66, 349.23, 440.0, 523.25], // Dm7   (D4, F4, A4, C5)
  [261.63, 329.63, 392.0, 493.88], // Cmaj7 (C4, E4, G4, B4)
];

const MELODY_NOTES: number[] = [
  523.25, 587.33, 659.25, 783.99, 880.0, 1046.5,
];

class SoundManager {
  private ctx: AudioContext | null = null;
  private bgmMasterGain: GainNode | null = null;
  private bgmInterval: number | null = null;
  private chordStep = 0;
  private isDucked = false;
  private settings: AudioSettings = {
    bgmEnabled: true,
    sfxEnabled: true,
    ttsEnabled: true,
    bgmVolume: 0.35,
    ttsVolume: 0.9,
  };

  private ttsQueue: string[] = [];
  private isSpeaking = false;
  private lastCastSfxAt = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.ensureAudioContext();
        if (this.settings.bgmEnabled) {
          this.startBgmLoop();
        }
      };
      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
      // Also attempt immediate start (works inside TikTok LIVE Studio Browser Source / OBS)
      setTimeout(() => {
        this.ensureAudioContext();
        if (this.settings.bgmEnabled) {
          this.startBgmLoop();
        }
      }, 600);
    }
  }

  private ensureAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.bgmMasterGain = this.ctx.createGain();
      this.bgmMasterGain.gain.value = this.getEffectiveBgmGain();
      this.bgmMasterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        // Will resume on first interaction if browser requires gesture
      });
    }
    return this.ctx;
  }

  private getEffectiveBgmGain(): number {
    if (!this.settings.bgmEnabled) return 0;
    const base = this.settings.bgmVolume * 0.22;
    return this.isDucked ? base * 0.22 : base;
  }

  private syncBgmGain() {
    if (!this.ctx || !this.bgmMasterGain) return;
    const now = this.ctx.currentTime;
    const target = this.getEffectiveBgmGain();
    this.bgmMasterGain.gain.cancelScheduledValues(now);
    this.bgmMasterGain.gain.setTargetAtTime(target, now, 0.18);
  }

  public updateSettings(next: AudioSettings) {
    this.settings = { ...next };
    this.syncBgmGain();
    if (this.settings.bgmEnabled) {
      this.startBgmLoop();
    } else {
      this.stopBgmLoop();
    }
  }

  public getSettings(): AudioSettings {
    return this.settings;
  }

  /**
   * Starts copyright-free procedural Chill Lofi / Kalimba + gentle pond ambience
   */
  public startBgmLoop() {
    if (typeof window === 'undefined') return;
    if (this.bgmInterval !== null) return;

    this.ensureAudioContext();
    this.playChillStep();
    this.bgmInterval = window.setInterval(() => {
      if (!this.settings.bgmEnabled) return;
      this.playChillStep();
    }, 2400);
  }

  public stopBgmLoop() {
    if (this.bgmInterval !== null && typeof window !== 'undefined') {
      window.clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  private playChillStep() {
    const ctx = this.ensureAudioContext();
    if (!ctx || ctx.state !== 'running' || !this.bgmMasterGain) return;
    if (!this.settings.bgmEnabled) return;

    const now = ctx.currentTime;
    const chord = CHILL_CHORDS[this.chordStep % CHILL_CHORDS.length];
    this.chordStep++;

    // 1. Warm Rhodes/Pad arpeggio notes
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);

      noteGain.gain.setValueAtTime(0.0001, now + idx * 0.14);
      noteGain.gain.linearRampToValueAtTime(
        idx === 0 ? 0.28 : 0.16,
        now + idx * 0.14 + 0.08
      );
      noteGain.gain.exponentialRampToValueAtTime(
        0.001,
        now + idx * 0.14 + 2.1
      );

      osc.connect(noteGain);
      noteGain.connect(this.bgmMasterGain!);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 2.15);
    });

    // 2. Gentle Kalimba highplink note on off-beats
    if (Math.random() < 0.78) {
      const plinkFreq =
        MELODY_NOTES[Math.floor(Math.random() * MELODY_NOTES.length)];
      const osc = ctx.createOscillator();
      const plinkGain = ctx.createGain();
      osc.type = 'sine';
      const delay = 0.85 + Math.floor(Math.random() * 3) * 0.38;
      osc.frequency.setValueAtTime(plinkFreq, now + delay);

      plinkGain.gain.setValueAtTime(0.0001, now + delay);
      plinkGain.gain.linearRampToValueAtTime(0.18, now + delay + 0.02);
      plinkGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.9);

      osc.connect(plinkGain);
      plinkGain.connect(this.bgmMasterGain!);
      osc.start(now + delay);
      osc.stop(now + delay + 0.95);
    }
  }

  /**
   * Soft water plop SFX when an angler casts their line (throttled so crowd waves don't clip)
   */
  public playCastSplash() {
    if (!this.settings.sfxEnabled) return;
    const nowMs = Date.now();
    if (nowMs - this.lastCastSfxAt < 450) return;
    this.lastCastSfxAt = nowMs;

    const ctx = this.ensureAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(115, now + 0.14);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.24);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.27);
  }

  /**
   * Pleasant chime when a fish is caught (brighter fanfare for Rare/Epic/Legendary)
   */
  public playCatchChime(rarity: FishRarity) {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.ensureAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    const isHigh =
      rarity === 'LEGENDARY' || rarity === 'EPIC' || rarity === 'RARE';
    const notes = isHigh
      ? [523.25, 659.25, 783.99, 1046.5]
      : [523.25, 659.25];
    const now = ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0.001, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(
        isHigh ? 0.16 : 0.08,
        now + i * 0.08 + 0.02
      );
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + i * 0.08 + (isHigh ? 0.55 : 0.3)
      );

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + (isHigh ? 0.6 : 0.35));
    });
  }

  /**
   * Soft 2-note notification bell before TTS voice announcement
   */
  private playNotificationBell(): Promise<void> {
    return new Promise((resolve) => {
      const ctx = this.ensureAudioContext();
      if (!ctx || ctx.state !== 'running' || !this.settings.sfxEnabled) {
        resolve();
        return;
      }
      const now = ctx.currentTime;
      const bellNotes = [659.25, 880.0]; // E5 -> A5
      bellNotes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.11);

        gain.gain.setValueAtTime(0.001, now + idx * 0.11);
        gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.11 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.11);
        osc.stop(now + idx * 0.11 + 0.38);
      });
      setTimeout(resolve, 260);
    });
  }

  /**
   * Queues a short Vietnamese voice announcement (max 2 queued to prevent lag during gift storms)
   */
  public speakAnnouncement(text?: string) {
    if (!this.settings.ttsEnabled) return;
    const cleaned = (text || '').trim();
    if (!cleaned) return;

    // Avoid queuing identical back-to-back announcements or exceeding 2 pending items
    if (this.ttsQueue.includes(cleaned)) return;
    if (this.ttsQueue.length >= 2) {
      this.ttsQueue.shift();
    }
    this.ttsQueue.push(cleaned);
    this.processTtsQueue();
  }

  private async processTtsQueue() {
    if (this.isSpeaking) return;
    const nextText = this.ttsQueue.shift();
    if (!nextText) return;

    this.isSpeaking = true;
    this.isDucked = true;
    this.syncBgmGain();

    try {
      await this.playNotificationBell();
      await this.playVietnameseTtsAudio(nextText);
    } catch {
      // Ignore audio playback errors
    } finally {
      this.isSpeaking = false;
      if (this.ttsQueue.length > 0) {
        this.processTtsQueue();
      } else {
        this.isDucked = false;
        this.syncBgmGain();
      }
    }
  }

  private playVietnameseTtsAudio(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve();
        return;
      }

      const apiBase = getBackendBaseUrl();
      const ttsUrl = `${apiBase}/api/tts?text=${encodeURIComponent(text)}`;
      const audio = new Audio(ttsUrl);
      audio.volume = Math.max(0.1, Math.min(1, this.settings.ttsVolume));
      audio.playbackRate = 1.15; // Crisp, lively announcement pace

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      const safetyTimeout = window.setTimeout(finish, 6500);

      audio.onended = () => {
        window.clearTimeout(safetyTimeout);
        finish();
      };

      audio.onerror = () => {
        window.clearTimeout(safetyTimeout);
        this.fallbackWebSpeechTts(text).finally(finish);
      };

      audio.play().catch(() => {
        window.clearTimeout(safetyTimeout);
        this.fallbackWebSpeechTts(text).finally(finish);
      });
    });
  }

  private fallbackWebSpeechTts(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (
        typeof window === 'undefined' ||
        !('speechSynthesis' in window)
      ) {
        resolve();
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'vi-VN';
        utter.rate = 1.12;
        utter.volume = Math.max(0.1, Math.min(1, this.settings.ttsVolume));
        const voices = window.speechSynthesis.getVoices();
        const viVoice = voices.find((v) =>
          v.lang.toLowerCase().includes('vi')
        );
        if (viVoice) utter.voice = viVoice;
        const t = window.setTimeout(resolve, 5000);
        utter.onend = () => {
          window.clearTimeout(t);
          resolve();
        };
        utter.onerror = () => {
          window.clearTimeout(t);
          resolve();
        };
        window.speechSynthesis.speak(utter);
      } catch {
        resolve();
      }
    });
  }
}

export const soundManager = new SoundManager();
