let levels = [];
let currentLevelIndex = 0;
let score = 0;
let mistakes = 0;
let beltItems = [];
let running = false;
let spawnQueue = [];
let spawnTimer = 0;
let lastTs = 0;
let nextLane = 0;
let LANE_Y = [];

const TYPES = [
  { key: 'Pen', emoji: '✏️', color: '#ffd85f' },
  { key: 'Note', emoji: '🗒️', color: '#ff9dca' },
  { key: 'Accessory', emoji: '📎', color: '#8ee7b3' }
];

const els = {};

let dragEl = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let dragItemData = null;

document.addEventListener('DOMContentLoaded', async () => {
  els.scoreChip = document.getElementById('scoreChip');
  els.objectiveText = document.getElementById('objectiveText');
  els.levelLabel = document.getElementById('levelLabel');
  els.itemsRoot = document.getElementById('itemsRoot');
  els.belt = document.getElementById('belt');
  els.endPanel = document.getElementById('endPanel');
  els.endTitle = document.getElementById('endTitle');
  els.endSubtitle = document.getElementById('endSubtitle');
  els.nextLevelBtn = document.getElementById('nextLevelBtn');
  els.bins = Array.from(document.querySelectorAll('.bin'));
  els.phone = document.querySelector('.phone');

  document.body.addEventListener('pointerdown', () => window.Sounds && window.Sounds.unlockAudio(), { once: true });

  await loadLevels();
  setupNextButton();
  computeLaneY();
  startLevel(0);
  requestAnimationFrame(loop);
});

function computeLaneY() {
  const beltHeight = els.belt.clientHeight;
  const itemSize = 58;
  const margin = 6;
  LANE_Y = [margin, beltHeight/2 - itemSize/2, beltHeight - itemSize - margin];
}

async function loadLevels() {
  const res = await fetch('levels.json');
  const data = await res.json();
  levels = data.levels || [];
}

function setupNextButton() {
  els.nextLevelBtn.addEventListener('click', () => {
    els.endPanel.classList.add('hidden');
    const next = currentLevelIndex + 1;
    startLevel(next >= levels.length ? 0 : next);
  });
}

function updateHUD() {
  els.scoreChip.textContent = '⭐ ' + score;
}

function startLevel(index) {
  currentLevelIndex = index;
  const level = levels[index] || levels[0];

  score = 0; mistakes = 0;
  beltItems.forEach(s => s.el.remove());
  beltItems = [];
  nextLane = 0; spawnTimer = 0; running = true;
  els.endPanel.classList.add('hidden');

  els.levelLabel.textContent = String(level.level || 1);
  els.objectiveText.textContent = `Smista ${level.targetPens} penne, ${level.targetNotes} note, ${level.targetAccessories} accessori`;
  els.itemsRoot.innerHTML = '';

  spawnQueue = [];
  for (let i=0;i<(level.targetPens||0);i++) spawnQueue.push('Pen');
  for (let i=0;i<(level.targetNotes||0);i++) spawnQueue.push('Note');
  for (let i=0;i<(level.targetAccessories||0);i++) spawnQueue.push('Accessory');
  spawnQueue = shuffle(spawnQueue);

  updateHUD();
  lastTs = performance.now();
}

function shuffle(arr){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

function spawnNextItem() {
  if (spawnQueue.length === 0) return;
  const type = spawnQueue.shift();
  const t = TYPES.find(x => x.key === type);
  const lane = nextLane % 3;
  nextLane++;

  const el = document.createElement('div');
  el.className = 'item';
  el.dataset.type = t.key;
  el.textContent = t.emoji;
  el.style.background = t.color;
  el.style.left = '-64px';
  el.style.top = LANE_Y[lane] + 'px';

  const data = { el, x: -64, y: LANE_Y[lane], lane, type: t.key, dragging: false };
  beltItems.push(data);
  attachDragHandlers(el, data);
  els.itemsRoot.appendChild(el);
}

function attachDragHandlers(el, data) {
  el.addEventListener('pointerdown', (e) => startDrag(e, el, data));
}

function startDrag(e, el, data) {
  if (!running) return;
  e.preventDefault();
  dragEl = el;
  dragItemData = data;
  data.dragging = true;
  el.classList.add('dragging');
  el.setPointerCapture(e.pointerId);

  window.Sounds && window.Sounds.pickUp();

  const rect = el.getBoundingClientRect();
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;

  el.style.zIndex = 50;
  el.style.transition = 'none';

  el.addEventListener('pointermove', onDragMove);
  el.addEventListener('pointerup', onDragEnd);
  el.addEventListener('pointercancel', onDragEnd);
}

function onDragMove(e) {
  if (!dragEl) return;
  const phoneRect = els.phone.getBoundingClientRect();
  const x = e.clientX - phoneRect.left - dragOffsetX;
  const y = e.clientY - phoneRect.top - dragOffsetY;
  dragEl.style.left = x + 'px';
  dragEl.style.top = y + 'px';

  els.bins.forEach(bin => {
    const br = bin.getBoundingClientRect();
    const over = e.clientX >= br.left && e.clientX <= br.right && e.clientY >= br.top && e.clientY <= br.bottom;
    bin.classList.toggle('bin-hover', over);
  });
}

function onDragEnd(e) {
  if (!dragEl) return;
  const el = dragEl;
  const data = dragItemData;

  el.removeEventListener('pointermove', onDragMove);
  el.removeEventListener('pointerup', onDragEnd);
  el.removeEventListener('pointercancel', onDragEnd);
  el.classList.remove('dragging');
  el.style.transition = '';

  let droppedBin = null;
  els.bins.forEach(bin => {
    const br = bin.getBoundingClientRect();
    const over = e.clientX >= br.left && e.clientX <= br.right && e.clientY >= br.top && e.clientY <= br.bottom;
    bin.classList.remove('bin-hover');
    if (over) droppedBin = bin;
  });

  dragEl = null;
  dragItemData = null;

  if (droppedBin) {
    resolveDrop(el, data, droppedBin);
  } else {
    data.dragging = false;
    el.style.top = data.y + 'px';
  }
}

function resolveDrop(el, data, bin) {
  const itemType = data.type;
  const binType = bin.dataset.type;

  window.Sounds && window.Sounds.drop();

  if (itemType === binType) {
    score += 10;
    beltItems = beltItems.filter(s => s.el !== el);
    el.remove();
    window.Sounds && window.Sounds.correct();
  } else {
    mistakes += 1;
    score = Math.max(0, score - 5);
    data.dragging = false;
    el.style.left = data.x + 'px';
    el.style.top = data.y + 'px';
    bin.classList.add('bin-shake');
    setTimeout(() => bin.classList.remove('bin-shake'), 240);
    window.Sounds && window.Sounds.wrong();
  }

  updateHUD();

  const level = levels[currentLevelIndex] || levels[0];
  if (mistakes >= (level.allowedMistakes || 5)) {
    showEnd(false, 'Troppi errori!');
    return;
  }
  checkWin();
}

function checkWin() {
  if (spawnQueue.length === 0 && beltItems.length === 0) showEnd(true);
}

function loop(ts) {
  if (!lastTs) lastTs = ts;
  const dt = (ts - lastTs) / 1000;
  lastTs = ts;

  if (running) {
    const level = levels[currentLevelIndex] || levels[0];
    const spawnInterval = level.spawnInterval || 1.0;

    spawnTimer += dt;
    if (spawnTimer >= spawnInterval && spawnQueue.length > 0) {
      spawnTimer = 0;
      spawnNextItem();
    }

    const beltWidth = els.belt.clientWidth;
    const speed = 55 * (level.beltSpeed || 1);

    for (let i = beltItems.length - 1; i >= 0; i--) {
      const s = beltItems[i];
      if (s.dragging) continue;
      s.x += speed * dt;
      s.el.style.left = s.x + 'px';

      if (s.x > beltWidth) {
        s.el.remove();
        beltItems.splice(i, 1);
        window.Sounds && window.Sounds.gameOver();
        showEnd(false, 'Un oggetto non smistato è caduto dal nastro!');
        return;
      }
    }
  }

  requestAnimationFrame(loop);
}

function showEnd(success, reasonText) {
  running = false;
  els.endPanel.classList.remove('hidden');
  els.endTitle.textContent = success ? 'Livello completato!' : 'Game Over';
  els.endSubtitle.textContent = success ? `Punteggio: ${score}` : (reasonText || `Errori: ${mistakes}`) + ` — Punteggio: ${score}`;
  if (success) window.Sounds && window.Sounds.levelComplete();
}
