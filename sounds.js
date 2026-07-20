let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq, duration, type, startGain, endGain, delay) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = freq;

  const now = ctx.currentTime + (delay || 0);
  gain.gain.setValueAtTime(startGain, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(endGain, 0.0001), now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

const Sounds = {
  unlockAudio() {
    getCtx();
  },

  correct() {
    playTone(660, 0.09, 'triangle', 0.22, 0.001, 0);
    playTone(880, 0.12, 'triangle', 0.18, 0.001, 0.06);
  },

  wrong() {
    playTone(180, 0.16, 'sawtooth', 0.20, 0.001, 0);
    playTone(140, 0.18, 'sawtooth', 0.16, 0.001, 0.05);
  },

  pickUp() {
    playTone(520, 0.05, 'square', 0.10, 0.001, 0);
  },

  drop() {
    playTone(300, 0.06, 'square', 0.08, 0.001, 0);
  },

  levelComplete() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => playTone(f, 0.16, 'triangle', 0.22, 0.001, i * 0.11));
  },

  gameOver() {
    playTone(300, 0.18, 'sawtooth', 0.22, 0.001, 0);
    playTone(220, 0.20, 'sawtooth', 0.20, 0.001, 0.14);
    playTone(140, 0.30, 'sawtooth', 0.20, 0.001, 0.28);
  }
};

window.Sounds = Sounds;
