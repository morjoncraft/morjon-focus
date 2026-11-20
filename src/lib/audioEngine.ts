import { loadCustomAudioBlob } from './customAudioStorage';
import type { AlarmSoundId, SoundscapeId } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private activeSound: SoundscapeId = 'off';
  private masterGain: GainNode | null = null;
  private activeNodes: AudioNode[] = [];
  private activeSources: AudioScheduledSourceNode[] = [];
  private customAudioEl: HTMLAudioElement | null = null;
  private customObjectUrl: string | null = null;
  private volume = 0.5;
  private continuousAlarmTimer: number | null = null;
  private continuousAlarmStartedAt = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private stopCurrentSoundscape(): void {
    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch {
        // ignore
      }
      try {
        src.disconnect();
      } catch {
        // ignore
      }
    }
    for (const node of this.activeNodes) {
      try {
        node.disconnect();
      } catch {
        // ignore
      }
    }
    this.activeSources = [];
    this.activeNodes = [];
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // ignore
      }
      this.masterGain = null;
    }
    if (this.customAudioEl) {
      try {
        this.customAudioEl.pause();
        this.customAudioEl.src = '';
      } catch {
        // ignore
      }
      this.customAudioEl = null;
    }
    if (this.customObjectUrl) {
      try {
        URL.revokeObjectURL(this.customObjectUrl);
      } catch {
        // ignore
      }
      this.customObjectUrl = null;
    }
  }

  private createPinkNoiseBuffer(ctx: AudioContext, seconds = 5): AudioBuffer {
    const length = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      let b3 = 0;
      let b4 = 0;
      let b5 = 0;
      let b6 = 0;

      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.153852;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
        b6 = white * 0.115926;
      }

      const fade = Math.min(2048, Math.floor(length / 10));
      for (let i = 0; i < fade; i++) {
        const t = i / fade;
        const tailIdx = length - fade + i;
        const blended = data[i] * t + data[tailIdx] * (1 - t);
        data[i] = blended;
        data[tailIdx] = blended;
      }
    }
    return buffer;
  }

  private createBrownNoiseBuffer(ctx: AudioContext, seconds = 5): AudioBuffer {
    const length = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let lastOut = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.022 * white) / 1.022;
        data[i] = lastOut * 2.2;
      }
      const fade = Math.min(2048, Math.floor(length / 10));
      for (let i = 0; i < fade; i++) {
        const t = i / fade;
        const tailIdx = length - fade + i;
        const blended = data[i] * t + data[tailIdx] * (1 - t);
        data[i] = blended;
        data[tailIdx] = blended;
      }
    }
    return buffer;
  }

  private createCrackleBuffer(ctx: AudioContext, seconds = 8): AudioBuffer {
    const length = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let idx = Math.floor(Math.random() * ctx.sampleRate * 0.25);
      while (idx < length) {
        const amp = 0.25 + Math.random() * 0.65;
        const popLen = Math.floor(ctx.sampleRate * (0.003 + Math.random() * 0.013));
        const decay = 4.5 + Math.random() * 3.5;
        for (let j = 0; j < popLen && idx + j < length; j++) {
          const env = Math.exp((-j / popLen) * decay);
          data[idx + j] += (Math.random() * 2 - 1) * amp * env;
        }
        // Sparse cozy ember intervals (60ms..550ms)
        idx += Math.floor(ctx.sampleRate * (0.06 + Math.random() * 0.48));
      }

      const fade = Math.min(2048, Math.floor(length / 10));
      for (let i = 0; i < fade; i++) {
        const t = i / fade;
        const tailIdx = length - fade + i;
        const blended = data[i] * t + data[tailIdx] * (1 - t);
        data[i] = blended;
        data[tailIdx] = blended;
      }
    }
    return buffer;
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume * 0.65, this.ctx.currentTime, 0.08);
    }
    if (this.customAudioEl) {
      this.customAudioEl.volume = Math.max(0, Math.min(1, this.volume * 0.85));
    }
  }

  public reloadCustomSound(): void {
    if (this.activeSound === 'custom') {
      const vol = this.volume;
      this.stopCurrentSoundscape();
      this.activeSound = 'off';
      this.setSoundscape('custom', vol);
    }
  }

  public setSoundscape(id: SoundscapeId, volume = this.volume): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (id === this.activeSound && id !== 'off') {
      this.setVolume(this.volume);
      return;
    }

    this.stopCurrentSoundscape();
    this.activeSound = id;

    if (id === 'off') return;

    if (id === 'custom') {
      void loadCustomAudioBlob()
        .then((blob) => {
          if (!blob || this.activeSound !== 'custom') return;
          const url = URL.createObjectURL(blob);
          const el = new Audio(url);
          el.loop = true;
          el.volume = Math.max(0, Math.min(1, this.volume * 0.85));
          this.customObjectUrl = url;
          this.customAudioEl = el;
          void el.play().catch(() => {});
        })
        .catch(() => {});
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx) return;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(
      Math.max(0.001, this.volume * 0.65),
      ctx.currentTime + 0.35,
    );
    master.connect(ctx.destination);
    this.masterGain = master;

    if (id === 'white') {
      const src = ctx.createBufferSource();
      src.buffer = this.createPinkNoiseBuffer(ctx, 5);
      src.loop = true;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 3200;

      src.connect(lowpass);
      lowpass.connect(master);
      src.start();

      this.activeSources.push(src);
      this.activeNodes.push(lowpass);
    } else if (id === 'rain') {
      const src1 = ctx.createBufferSource();
      src1.buffer = this.createPinkNoiseBuffer(ctx, 6);
      src1.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 1150;
      bandpass.Q.value = 0.55;

      const bedGain = ctx.createGain();
      bedGain.gain.value = 0.9;

      const src2 = ctx.createBufferSource();
      src2.buffer = this.createBrownNoiseBuffer(ctx, 5);
      src2.loop = true;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 320;

      const rumbleGain = ctx.createGain();
      rumbleGain.gain.value = 0.45;

      src1.connect(bandpass);
      bandpass.connect(bedGain);
      bedGain.connect(master);

      src2.connect(lowpass);
      lowpass.connect(rumbleGain);
      rumbleGain.connect(master);

      src1.start();
      src2.start();

      this.activeSources.push(src1, src2);
      this.activeNodes.push(bandpass, bedGain, lowpass, rumbleGain);
    } else if (id === 'cafe') {
      const roomSrc = ctx.createBufferSource();
      roomSrc.buffer = this.createBrownNoiseBuffer(ctx, 6);
      roomSrc.loop = true;

      const roomLp = ctx.createBiquadFilter();
      roomLp.type = 'lowpass';
      roomLp.frequency.value = 420;

      const roomGain = ctx.createGain();
      roomGain.gain.value = 0.7;

      const murmurSrc = ctx.createBufferSource();
      murmurSrc.buffer = this.createPinkNoiseBuffer(ctx, 5);
      murmurSrc.loop = true;

      const murmurBp = ctx.createBiquadFilter();
      murmurBp.type = 'bandpass';
      murmurBp.frequency.value = 620;
      murmurBp.Q.value = 1.2;

      const murmurGain = ctx.createGain();
      murmurGain.gain.value = 0.28;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.22;

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 180;

      lfo.connect(lfoGain);
      lfoGain.connect(murmurBp.frequency);

      roomSrc.connect(roomLp);
      roomLp.connect(roomGain);
      roomGain.connect(master);

      murmurSrc.connect(murmurBp);
      murmurBp.connect(murmurGain);
      murmurGain.connect(master);

      roomSrc.start();
      murmurSrc.start();
      lfo.start();

      this.activeSources.push(roomSrc, murmurSrc, lfo);
      this.activeNodes.push(roomLp, roomGain, murmurBp, murmurGain, lfoGain);
    } else if (id === 'brown') {
      const src = ctx.createBufferSource();
      src.buffer = this.createBrownNoiseBuffer(ctx, 5);
      src.loop = true;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 540;

      src.connect(lowpass);
      lowpass.connect(master);
      src.start();

      this.activeSources.push(src);
      this.activeNodes.push(lowpass);
    } else if (id === 'beach') {
      // Rhythmic ocean surf waves
      const waveSrc = ctx.createBufferSource();
      waveSrc.buffer = this.createPinkNoiseBuffer(ctx, 7);
      waveSrc.loop = true;

      const waveLp = ctx.createBiquadFilter();
      waveLp.type = 'lowpass';
      waveLp.frequency.value = 780;

      const waveGain = ctx.createGain();
      waveGain.gain.value = 0.5;

      const surfLfo = ctx.createOscillator();
      surfLfo.type = 'sine';
      surfLfo.frequency.value = 0.11; // ~9s wave cycle

      const surfDepth = ctx.createGain();
      surfDepth.gain.value = 0.36;

      const freqDepth = ctx.createGain();
      freqDepth.gain.value = 460;

      surfLfo.connect(surfDepth);
      surfDepth.connect(waveGain.gain);
      surfLfo.connect(freqDepth);
      freqDepth.connect(waveLp.frequency);

      waveSrc.connect(waveLp);
      waveLp.connect(waveGain);
      waveGain.connect(master);

      waveSrc.start();
      surfLfo.start();

      this.activeSources.push(waveSrc, surfLfo);
      this.activeNodes.push(waveLp, waveGain, surfDepth, freqDepth);
    } else if (id === 'forest') {
      // Soft canopy wind breeze
      const windSrc = ctx.createBufferSource();
      windSrc.buffer = this.createPinkNoiseBuffer(ctx, 6);
      windSrc.loop = true;

      const windBp = ctx.createBiquadFilter();
      windBp.type = 'bandpass';
      windBp.frequency.value = 480;
      windBp.Q.value = 0.7;

      const windGain = ctx.createGain();
      windGain.gain.value = 0.55;

      const windLfo = ctx.createOscillator();
      windLfo.type = 'sine';
      windLfo.frequency.value = 0.15;

      const windLfoDepth = ctx.createGain();
      windLfoDepth.gain.value = 210;

      windLfo.connect(windLfoDepth);
      windLfoDepth.connect(windBp.frequency);

      windSrc.connect(windBp);
      windBp.connect(windGain);
      windGain.connect(master);

      windSrc.start();
      windLfo.start();

      this.activeSources.push(windSrc, windLfo);
      this.activeNodes.push(windBp, windGain, windLfoDepth);
    } else if (id === 'campfire') {
      // Warm hearth base rumble + gentle flame air + woody crackles
      const baseSrc = ctx.createBufferSource();
      baseSrc.buffer = this.createBrownNoiseBuffer(ctx, 6);
      baseSrc.loop = true;

      const baseLp = ctx.createBiquadFilter();
      baseLp.type = 'lowpass';
      baseLp.frequency.value = 260;

      const baseGain = ctx.createGain();
      baseGain.gain.value = 0.55;

      const flameLfo = ctx.createOscillator();
      flameLfo.type = 'sine';
      flameLfo.frequency.value = 0.18;

      const flameDepth = ctx.createGain();
      flameDepth.gain.value = 55;

      flameLfo.connect(flameDepth);
      flameDepth.connect(baseLp.frequency);

      const airSrc = ctx.createBufferSource();
      airSrc.buffer = this.createPinkNoiseBuffer(ctx, 5);
      airSrc.loop = true;

      const airBp = ctx.createBiquadFilter();
      airBp.type = 'bandpass';
      airBp.frequency.value = 720;
      airBp.Q.value = 0.8;

      const airGain = ctx.createGain();
      airGain.gain.value = 0.16;

      const crackleSrc = ctx.createBufferSource();
      crackleSrc.buffer = this.createCrackleBuffer(ctx, 8);
      crackleSrc.loop = true;

      const crackleBp = ctx.createBiquadFilter();
      crackleBp.type = 'bandpass';
      crackleBp.frequency.value = 1750;
      crackleBp.Q.value = 0.75;

      const crackleGain = ctx.createGain();
      crackleGain.gain.value = 0.38;

      baseSrc.connect(baseLp);
      baseLp.connect(baseGain);
      baseGain.connect(master);

      airSrc.connect(airBp);
      airBp.connect(airGain);
      airGain.connect(master);

      crackleSrc.connect(crackleBp);
      crackleBp.connect(crackleGain);
      crackleGain.connect(master);

      baseSrc.start();
      airSrc.start();
      crackleSrc.start();
      flameLfo.start();

      this.activeSources.push(baseSrc, airSrc, crackleSrc, flameLfo);
      this.activeNodes.push(
        baseLp,
        baseGain,
        flameDepth,
        airBp,
        airGain,
        crackleBp,
        crackleGain,
      );
    } else if (id === 'winter') {
      // Snow-muffled hush + dual swirling crisp winter gusts
      const snowSrc = ctx.createBufferSource();
      snowSrc.buffer = this.createBrownNoiseBuffer(ctx, 6);
      snowSrc.loop = true;

      const snowLp = ctx.createBiquadFilter();
      snowLp.type = 'lowpass';
      snowLp.frequency.value = 320;

      const snowGain = ctx.createGain();
      snowGain.gain.value = 0.48;

      const gust1Src = ctx.createBufferSource();
      gust1Src.buffer = this.createPinkNoiseBuffer(ctx, 7);
      gust1Src.loop = true;

      const gust1Bp = ctx.createBiquadFilter();
      gust1Bp.type = 'bandpass';
      gust1Bp.frequency.value = 520;
      gust1Bp.Q.value = 2.2;

      const gust1Gain = ctx.createGain();
      gust1Gain.gain.value = 0.34;

      const gust1Lfo = ctx.createOscillator();
      gust1Lfo.type = 'sine';
      gust1Lfo.frequency.value = 0.08;

      const gust1FreqDepth = ctx.createGain();
      gust1FreqDepth.gain.value = 210;
      gust1Lfo.connect(gust1FreqDepth);
      gust1FreqDepth.connect(gust1Bp.frequency);

      const gust2Src = ctx.createBufferSource();
      gust2Src.buffer = this.createPinkNoiseBuffer(ctx, 6);
      gust2Src.loop = true;

      const gust2Bp = ctx.createBiquadFilter();
      gust2Bp.type = 'bandpass';
      gust2Bp.frequency.value = 860;
      gust2Bp.Q.value = 2.6;

      const gust2Gain = ctx.createGain();
      gust2Gain.gain.value = 0.14;

      const gust2Lfo = ctx.createOscillator();
      gust2Lfo.type = 'sine';
      gust2Lfo.frequency.value = 0.055;

      const gust2FreqDepth = ctx.createGain();
      gust2FreqDepth.gain.value = 280;
      gust2Lfo.connect(gust2FreqDepth);
      gust2FreqDepth.connect(gust2Bp.frequency);

      const gust2AmpDepth = ctx.createGain();
      gust2AmpDepth.gain.value = 0.11;
      gust2Lfo.connect(gust2AmpDepth);
      gust2AmpDepth.connect(gust2Gain.gain);

      snowSrc.connect(snowLp);
      snowLp.connect(snowGain);
      snowGain.connect(master);

      gust1Src.connect(gust1Bp);
      gust1Bp.connect(gust1Gain);
      gust1Gain.connect(master);

      gust2Src.connect(gust2Bp);
      gust2Bp.connect(gust2Gain);
      gust2Gain.connect(master);

      snowSrc.start();
      gust1Src.start();
      gust2Src.start();
      gust1Lfo.start();
      gust2Lfo.start();

      this.activeSources.push(snowSrc, gust1Src, gust2Src, gust1Lfo, gust2Lfo);
      this.activeNodes.push(
        snowLp,
        snowGain,
        gust1Bp,
        gust1Gain,
        gust1FreqDepth,
        gust2Bp,
        gust2Gain,
        gust2FreqDepth,
        gust2AmpDepth,
      );
    }
  }

  public playTimerDoneChime(soundId: AlarmSoundId = 'crystal_chime'): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (soundId === 'soft_harp') {
      const notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
      notes.forEach((freq, idx) => {
        const start = now + idx * 0.085;
        const osc = ctx.createOscillator();
        const overtone = ctx.createOscillator();
        const gain = ctx.createGain();
        const overGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        overtone.type = 'triangle';
        overtone.frequency.setValueAtTime(freq * 2, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.14, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.6);

        overGain.gain.setValueAtTime(0.0001, start);
        overGain.gain.linearRampToValueAtTime(0.035, start + 0.01);
        overGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);

        osc.connect(gain);
        overtone.connect(overGain);
        overGain.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        overtone.start(start);
        osc.stop(start + 1.65);
        overtone.stop(start + 0.55);
      });
      return;
    }

    if (soundId === 'singing_bowl') {
      const partials: Array<[number, number, number]> = [
        [256, 0.2, 3.0],
        [512, 0.09, 2.4],
        [769.2, 0.045, 1.9],
      ];
      partials.forEach(([freq, peak, dur]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(peak, now + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + dur + 0.05);
      });
      return;
    }

    if (soundId === 'warm_marimba') {
      const notes = [349.23, 440, 523.25, 698.46];
      notes.forEach((freq, idx) => {
        const start = now + idx * 0.12;
        const fund = ctx.createOscillator();
        const harmonic = ctx.createOscillator();
        const fundGain = ctx.createGain();
        const harmGain = ctx.createGain();

        fund.type = 'sine';
        fund.frequency.setValueAtTime(freq, start);
        harmonic.type = 'sine';
        harmonic.frequency.setValueAtTime(freq * 4, start);

        fundGain.gain.setValueAtTime(0.0001, start);
        fundGain.gain.linearRampToValueAtTime(0.2, start + 0.008);
        fundGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.55);

        harmGain.gain.setValueAtTime(0.0001, start);
        harmGain.gain.linearRampToValueAtTime(0.07, start + 0.004);
        harmGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.08);

        fund.connect(fundGain);
        harmonic.connect(harmGain);
        fundGain.connect(ctx.destination);
        harmGain.connect(ctx.destination);

        fund.start(start);
        harmonic.start(start);
        fund.stop(start + 0.58);
        harmonic.stop(start + 0.1);
      });
      return;
    }

    if (soundId === 'gentle_piano') {
      const notes = [392.0, 493.88, 587.33, 739.99, 880.0];
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1350, now);
      filter.connect(ctx.destination);

      notes.forEach((freq, idx) => {
        const start = now + idx * 0.04;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.11, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.9);

        osc.connect(gain);
        gain.connect(filter);
        osc.start(start);
        osc.stop(start + 1.95);
      });
      return;
    }

    if (soundId === 'digital_pulse') {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.connect(ctx.destination);

      const offsets = [0, 0.13, 0.48, 0.61];
      offsets.forEach((offset) => {
        const start = now + offset;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.09, start + 0.006);
        gain.gain.setValueAtTime(0.09, start + 0.07);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.095);

        osc.connect(gain);
        gain.connect(filter);
        osc.start(start);
        osc.stop(start + 0.11);
      });
      return;
    }

    if (soundId === 'classic_bell') {
      const strikes = [0, 0.42];
      const partials: Array<[number, number]> = [
        [1046.5, 0.14],
        [2093.0, 0.075],
        [3135.96, 0.035],
      ];
      strikes.forEach((strikeOffset) => {
        const start = now + strikeOffset;
        partials.forEach(([freq, peak]) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.linearRampToValueAtTime(peak, start + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.7);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 1.75);
        });
      });
      return;
    }

    // Default: 'crystal_chime'
    const notes = [523.25, 659.25, 783.99, 987.77];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.14);
      gain.gain.linearRampToValueAtTime(0.16, now + idx * 0.14 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 1.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 1.2);
    });
  }

  public startContinuousAlarm(soundId: AlarmSoundId = 'crystal_chime'): void {
    this.stopContinuousAlarm();
    this.continuousAlarmStartedAt = Date.now();
    this.playTimerDoneChime(soundId);

    this.continuousAlarmTimer = window.setInterval(() => {
      if (Date.now() - this.continuousAlarmStartedAt >= 5 * 60 * 1000) {
        this.stopContinuousAlarm();
        return;
      }
      this.playTimerDoneChime(soundId);
    }, 3400);
  }

  public stopContinuousAlarm(): void {
    if (this.continuousAlarmTimer !== null) {
      window.clearInterval(this.continuousAlarmTimer);
      this.continuousAlarmTimer = null;
    }
  }

  public playIntervalChime(volumeScale1To10 = 4): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const vol = Math.max(0.02, Math.min(0.25, (volumeScale1To10 / 10) * 0.22));
    const now = ctx.currentTime;
    const freqs = [432, 648]; // gentle harmonic bell

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.04);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.04);
      gain.gain.linearRampToValueAtTime(vol / (idx + 1), now + idx * 0.04 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 1.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 1.65);
    });
  }

  public playMicroWarmupDoneChime(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.14, now + idx * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.6);
    });
  }

  public playCompleteSound(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [587.33, 880];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.14, now + idx * 0.08 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.35);
    });
  }

  public playUiClick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }
}

export const audioEngine = new AudioEngine();
