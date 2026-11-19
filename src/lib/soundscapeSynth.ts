import type { SoundscapeBlueprint } from '../types/music.ts';

export class SoundscapeSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private timerId: number | null = null;
  private isPlaying = false;
  private chordIdx = 0;
  private stepIdx = 0;
  private volume = 0.45;
  private blueprint: SoundscapeBlueprint | null = null;
  private onChordChange?: (chordName: string, index: number) => void;

  setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.volume * 0.55,
        this.ctx.currentTime,
        0.05
      );
    }
  }

  start(
    blueprint: SoundscapeBlueprint,
    onChordChange?: (chordName: string, index: number) => void
  ) {
    this.stop();

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) {
      throw new Error('Browser Anda tidak mendukung Web Audio API.');
    }

    this.ctx = new AudioCtx();
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume * 0.55, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.blueprint = blueprint;
    this.onChordChange = onChordChange;
    this.isPlaying = true;
    this.chordIdx = 0;
    this.stepIdx = 0;

    const safeBpm = Math.max(54, Math.min(140, blueprint.bpm || 76));
    const stepMs = Math.round((60 / safeBpm) * 1000);

    const tick = () => {
      if (!this.isPlaying || !this.ctx || !this.masterGain || !this.blueprint) {
        return;
      }
      const chords = this.blueprint.chords;
      if (!chords || chords.length === 0) return;

      const currentChord = chords[this.chordIdx % chords.length];
      const stepInBar = this.stepIdx % 4;

      if (stepInBar === 0) {
        this.playWarmChord(currentChord.frequencies, (stepMs * 4) / 1000);
        this.onChordChange?.(currentChord.name, this.chordIdx % chords.length);
      }

      const melodyFreqs = currentChord.melodyFrequencies;
      if (melodyFreqs && melodyFreqs.length > 0) {
        const noteFreq = melodyFreqs[stepInBar % melodyFreqs.length];
        if (noteFreq && noteFreq > 40) {
          this.playMelodyNote(noteFreq, (stepMs * 1.4) / 1000);
        }
      }

      this.stepIdx += 1;
      if (this.stepIdx % 4 === 0) {
        this.chordIdx = (this.chordIdx + 1) % chords.length;
      }
    };

    tick();
    this.timerId = window.setInterval(tick, stepMs);
  }

  private playWarmChord(frequencies: number[], durationSec: number) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(
      this.blueprint?.waveform === 'warm-pad' ? 900 : 1400,
      now
    );

    const chordGain = this.ctx.createGain();
    chordGain.gain.setValueAtTime(0.0001, now);
    chordGain.gain.linearRampToValueAtTime(0.18, now + 0.35);
    chordGain.gain.setValueAtTime(0.16, now + Math.max(0.4, durationSec - 0.5));
    chordGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec + 0.25);

    filter.connect(chordGain);
    chordGain.connect(this.masterGain);

    const oscType: OscillatorType =
      this.blueprint?.waveform === 'triangle' ? 'triangle' : 'sine';

    for (const freq of frequencies.slice(0, 4)) {
      if (!Number.isFinite(freq) || freq < 35 || freq > 2000) continue;
      const osc = this.ctx.createOscillator();
      osc.type = oscType;
      osc.frequency.setValueAtTime(freq, now);
      osc.connect(filter);
      osc.start(now);
      osc.stop(now + durationSec + 0.3);
    }
  }

  private playMelodyNote(freq: number, durationSec: number) {
    if (!this.ctx || !this.masterGain) return;
    if (!Number.isFinite(freq) || freq < 60 || freq > 3000) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = this.blueprint?.waveform === 'sine' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    const noteGain = this.ctx.createGain();
    noteGain.gain.setValueAtTime(0.0001, now);
    noteGain.gain.linearRampToValueAtTime(0.14, now + 0.04);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(noteGain);
    noteGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + durationSec + 0.05);
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.ctx) {
      const closingCtx = this.ctx;
      this.ctx = null;
      this.masterGain = null;
      void closingCtx.close().catch(() => {});
    }
  }
}
