import math, struct, wave, io, base64, os

sr = 22050

def env(n, attack=0.01, decay=0.18):
    a = int(sr * attack)
    d = int(sr * decay)
    if n < a:
        return n / max(1, a)
    x = (n - a) / max(1, d)
    return max(0.0, math.exp(-4.5 * x))

def make_sound(spec, dur):
    ns = int(sr * dur)
    buf = []
    for i in range(ns):
        t = i / sr
        v = 0.0
        for f, a in spec:
            v += a * math.sin(2 * math.pi * f * t)
        v *= env(i, attack=0.008, decay=max(0.05, dur - 0.01))
        buf.append(max(-1.0, min(1.0, v * 0.45)))
    pcm = b''.join(struct.pack('<h', int(s * 32767)) for s in buf)
    bio = io.BytesIO()
    with wave.open(bio, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm)
    return base64.b64encode(bio.getvalue()).decode('ascii')

sounds = {
    'pickUp': make_sound([(740,1.0),(1110,0.25)], 0.08),
    'drop': make_sound([(420,1.0),(630,0.15)], 0.10),
    'correct': make_sound([(523.25,1.0),(659.25,0.8),(783.99,0.55)], 0.26),
    'wrong': make_sound([(240,1.0),(180,0.8)], 0.18),
    'levelComplete': make_sound([(523.25,1.0),(659.25,0.9),(783.99,0.8),(987.77,0.65)], 0.7),
    'gameOver': make_sound([(392,1.0),(311.13,0.85),(261.63,0.75)], 0.65),
}

js = """const SOUND_DATA = {
  pickUp: \"data:audio/wav;base64,%s\",
  drop: \"data:audio/wav;base64,%s\",
  correct: \"data:audio/wav;base64,%s\",
  wrong: \"data:audio/wav;base64,%s\",
  levelComplete: \"data:audio/wav;base64,%s\",
  gameOver: \"data:audio/wav;base64,%s\"
};

const audioPool = {};
let audioUnlocked = false;

function preloadAll() {
  Object.keys(SOUND_DATA).forEach(key => {
    const a = new Audio(SOUND_DATA[key]);
    a.preload = 'auto';
    a.load();
    audioPool[key] = a;
  });
}

function playSound(key) {
  if (!audioUnlocked) return;
  const base = audioPool[key];
  if (!base) return;
  const node = base.cloneNode(true);
  node.volume = 0.72;
  node.play().catch(() => {});
}

const Sounds = {
  unlockAudio() {
    if (audioUnlocked) return;
    const first = audioPool.pickUp;
    if (first) {
      first.play().then(() => {
        first.pause();
        first.currentTime = 0;
      }).catch(() => {});
    }
    audioUnlocked = true;
  },
  pickUp() { playSound('pickUp'); },
  drop() { playSound('drop'); },
  correct() { playSound('correct'); },
  wrong() { playSound('wrong'); },
  levelComplete() { playSound('levelComplete'); },
  gameOver() { playSound('gameOver'); }
};

preloadAll();
window.Sounds = Sounds;
['pointerdown','touchstart','click'].forEach(evt => {
  document.addEventListener(evt, function unlockOnce() {
    Sounds.unlockAudio();
  }, { once: true, passive: true });
});
""" % (sounds['pickUp'], sounds['drop'], sounds['correct'], sounds['wrong'], sounds['levelComplete'], sounds['gameOver'])

with open('output/stationery_sort_web/sounds.js','w', encoding='utf-8') as f:
    f.write(js)

print('sounds updated')
