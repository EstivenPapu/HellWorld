// Sonido hecho con Web Audio: no hay archivos que descargar, los efectos y la
// música se generan con código. El navegador solo deja sonar después del
// primer toque o tecla, por eso se "desbloquea" con la primera interacción.

const MASTER_VOLUME = 0.8;
const MIN_GAP = { hit: 50, bossHit: 60, soul: 40, attack: 80, enemyDie: 60, heal: 450 }; // ms entre repeticiones
const SCALE = [110, 130.81, 146.83, 164.81, 196, 220]; // La menor pentatónica, grave

class GameAudio { 
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.intensity = 0; // 0 = exploración, 1 = pelea contra el jefe
    this.lastPlayed = {};
    this.nextNoteTime = 0;

    // Efectos de sonido
    const arpeggio = (notes, type, duration, volume, step) =>
      notes.forEach((freq, i) => this.tone({ freq, type, duration, volume, delay: i * step }));

    this.sounds = {
      attack: () => {
        this.noise({ duration: 0.14, volume: 0.22, filter: 'highpass', from: 1500, to: 3500 });
        this.tone({ freq: 320, to: 120, type: 'sawtooth', duration: 0.1, volume: 0.06 });
      },
      hit: () => {
        this.tone({ freq: 180, to: 60, type: 'square', duration: 0.1, volume: 0.18 });
        this.noise({ duration: 0.06, volume: 0.15, filter: 'lowpass', from: 1200 });
      },
      bossHit: () => this.tone({ freq: 120, to: 50, type: 'square', duration: 0.12, volume: 0.16 }),
      enemyDie: () => {
        this.tone({ freq: 240, to: 40, type: 'sawtooth', duration: 0.4, volume: 0.2 });
        this.noise({ duration: 0.3, volume: 0.15, filter: 'lowpass', from: 800, to: 200 });
      },
      hurt: () => {
        this.tone({ freq: 220, to: 70, type: 'square', duration: 0.25, volume: 0.25 });
        this.noise({ duration: 0.12, volume: 0.2, filter: 'bandpass', from: 600 });
      },
      shieldBreak: () => {
        this.tone({ freq: 880, to: 220, type: 'triangle', duration: 0.25, volume: 0.2 });
        this.noise({ duration: 0.1, volume: 0.1, filter: 'highpass', from: 2000 });
      },
      roll: () => this.noise({ duration: 0.22, volume: 0.16, filter: 'bandpass', from: 500, to: 1400 }),
      flame: () => {
        this.noise({ duration: 0.3, volume: 0.22, filter: 'lowpass', from: 1800, to: 400 });
        this.tone({ freq: 500, to: 200, type: 'sawtooth', duration: 0.22, volume: 0.08 });
      },
      nova: () => {
        this.tone({ freq: 90, to: 420, type: 'sine', duration: 0.38, volume: 0.3 });
        this.noise({ duration: 0.35, volume: 0.18, filter: 'bandpass', from: 300, to: 2000 });
      },
      shield: () => {
        this.tone({ freq: 660, duration: 0.35, volume: 0.15 });
        this.tone({ freq: 990, duration: 0.4, volume: 0.12, delay: 0.08 });
      },
      nomana: () => this.tone({ freq: 130, to: 110, type: 'square', duration: 0.12, volume: 0.1 }),
      heal: () => this.tone({ freq: 523, to: 784, duration: 0.25, volume: 0.07 }),
      soul: () => {
        this.tone({ freq: 880, to: 1320, duration: 0.12, volume: 0.1 });
        this.tone({ freq: 1320, to: 1760, duration: 0.1, volume: 0.07, delay: 0.07 });
      },
      upgrade: () => arpeggio([523, 659, 784], 'sine', 0.3, 0.15, 0.09),
      slam: () => {
        this.tone({ freq: 80, to: 28, type: 'sine', duration: 0.55, volume: 0.5 });
        this.noise({ duration: 0.4, volume: 0.35, filter: 'lowpass', from: 700, to: 100 });
      },
      charge: () => {
        this.tone({ freq: 70, to: 180, type: 'sawtooth', duration: 0.5, volume: 0.14 });
        this.noise({ duration: 0.45, volume: 0.12, filter: 'lowpass', from: 500 });
      },
      orbs: () => {
        this.tone({ freq: 520, to: 200, type: 'triangle', duration: 0.22, volume: 0.13 });
        this.tone({ freq: 620, to: 240, type: 'triangle', duration: 0.22, volume: 0.1, delay: 0.06 });
      },
      warn: () => this.tone({ freq: 200, to: 320, type: 'triangle', duration: 0.3, volume: 0.08 }),
      altar: () => {
        this.tone({ freq: 523, duration: 0.6, volume: 0.14 });
        this.tone({ freq: 784, duration: 0.6, volume: 0.1, delay: 0.1 });
        this.tone({ freq: 1046, duration: 0.7, volume: 0.08, delay: 0.2 });
      },
      quest: () => arpeggio([392, 523], 'triangle', 0.2, 0.16, 0.12),
      questDone: () => arpeggio([392, 523, 659, 784], 'triangle', 0.25, 0.17, 0.1),
      victory: () => arpeggio([392, 494, 587, 784, 988], 'triangle', 0.5, 0.2, 0.16),
      death: () => {
        this.tone({ freq: 300, to: 45, type: 'sawtooth', duration: 1.3, volume: 0.28 });
        this.tone({ freq: 110, to: 30, type: 'sine', duration: 1.4, volume: 0.3 });
      },
    };

    const unlock = () => this.unlock();
    for (const type of ['pointerdown', 'keydown', 'touchstart']) {
      window.addEventListener(type, unlock);
    }
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM' && !e.repeat) this.toggleMute();
    });
  }

  // Crea el audio la primera vez que el jugador toca algo
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
    this.master.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.6;
    this.sfxGain.connect(this.master);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.3;
    this.musicGain.connect(this.master);

    // Ruido blanco de 1 segundo para los efectos "de aire"
    const length = this.ctx.sampleRate || 44100;
    this.noiseBuffer = this.ctx.createBuffer(1, length, length);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

    this.startMusic();
  }

  setMuted(value) {
    this.muted = Boolean(value);
    if (this.master) this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setIntensity(level) {
    this.intensity = level;
  }

  play(name) {
    if (!this.ctx || this.muted || this.ctx.state !== 'running') return;

    const now = performance.now();
    const gap = MIN_GAP[name] ?? 40;
    if (now - (this.lastPlayed[name] ?? -1e9) < gap) return;
    this.lastPlayed[name] = now;

    const sound = this.sounds[name];
    if (sound) sound();
  }

  // Un tono con envolvente: sube rápido y se apaga suave
  tone({ freq, to, type = 'sine', duration = 0.2, volume = 0.2, delay = 0, dest }) {
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + duration);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(gain).connect(dest || this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  // Ruido filtrado (golpes de aire, fuego, explosiones)
  noise({ duration = 0.2, volume = 0.2, filter = 'bandpass', from = 1000, to, delay = 0, dest }) {
    const t0 = this.ctx.currentTime + delay;
    const source = this.ctx.createBufferSource();
    const biquad = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    source.buffer = this.noiseBuffer;
    biquad.type = filter;
    biquad.frequency.setValueAtTime(from, t0);
    if (to) biquad.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + duration);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    source.connect(biquad).connect(gain).connect(dest || this.sfxGain);
    source.start(t0);
    source.stop(t0 + duration + 0.05);
  }

  // Música: un zumbido grave constante y notas sueltas de una escala menor.
  // En la pelea contra el jefe las notas van más rápido y se agrega un pulso.
  startMusic() {
    const drones = [
      { freq: 55, type: 'sine', volume: 0.12, detune: 0 },
      { freq: 82.41, type: 'triangle', volume: 0.06, detune: 7 },
    ];
    for (const d of drones) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = d.type;
      osc.frequency.value = d.freq;
      osc.detune.value = d.detune;
      gain.gain.value = d.volume;
      osc.connect(gain).connect(this.musicGain);
      osc.start();
    }

    this.nextNoteTime = this.ctx.currentTime + 0.5;
    this.musicTimer = setInterval(() => this.scheduleMusic(), 400);
  }

  scheduleMusic() {
    if (!this.ctx) return;

    // Si la pestaña estuvo dormida, no acumular notas atrasadas
    if (this.nextNoteTime < this.ctx.currentTime) {
      this.nextNoteTime = this.ctx.currentTime + 0.1;
    }

    const lookAhead = this.ctx.currentTime + 1.2;
    const interval = this.intensity > 0 ? 0.5 : 2.2;

    while (this.nextNoteTime < lookAhead) {
      const delay = Math.max(0, this.nextNoteTime - this.ctx.currentTime);
      const note = SCALE[Math.floor(Math.random() * SCALE.length)];

      this.tone({
        freq: note,
        type: 'triangle',
        duration: Math.min(3, interval * 1.6),
        volume: 0.12,
        delay,
        dest: this.musicGain,
      });

      if (this.intensity > 0) {
        this.tone({ freq: 55, to: 40, duration: 0.3, volume: 0.3, delay, dest: this.musicGain });
      }

      this.nextNoteTime += interval;
    }
  }
}

export const audio = new GameAudio();
export const sfx = (name) => audio.play(name);