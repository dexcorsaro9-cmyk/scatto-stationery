let levels = [];
let currentLevelIndex = 0;
let score = 0;
let mistakes = 0;
let selectedItem = null;
let beltState = [];
let beltSpeed = 1.0;
let running = false;

const TYPES = [
  { key: 'Pen', emoji: '✏️', color: '#ffd85f' },
  { key: 'Note', emoji: '🗒️', color: '#ff9dca' },
  { key: 'Accessory', emoji: '📎', color: '#8ee7b3' }
];

const LANE_Y = [18, 92, 166];
const els = {};

document.addEventListener('DOMContentLoaded', async () => {
  els.scoreChip = document.getElementById('scoreChip');
  els.objectiveText = document.getElementById('objectiveText');
  els.levelLabel = document.getElementById('levelLabel');
  els.itemsRoot = document.getElementById('itemsRoot');
  els.endPanel = document.getElementById('endPanel');
  els.endTitle = document.getElementById('endTitle');
  els.endSubtitle = document.getElementById('endSubtitle');
  els.nextLevelBtn = document.getElementById('nextLevelBtn');
  els.bins = Array.from(document.querySelectorAll('.bin'));

  await loadLevels();
  setupBins();
  setupNextButton();
  startLevel(0);
  running = true;
  requestAnimationFrame(loop);
});

async function loadLevels() {
  const res = await fetch('levels.json');
  const data = await res.json();
  levels = data.levels || [];
}

function setupBins() {
  els.bins.forEach(bin => bin.addEventListener('click', () => onBinClick(bin)));
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

  score = 0;
  mistakes = 0;
  selectedItem = null;
  beltState = [];
  running = true;

  els.levelLabel.textContent = String(level.level || 1);
  els.objectiveText.textContent = `Smista ${level.targetPens} penne, ${level.targetNotes} note, ${level.targetAccessories} accessori`;
  els.itemsRoot.innerHTML = '';

  const totalPens = level.targetPens || 0;
  const totalNotes = level.targetNotes || 0;
  const totalAccessories = level.targetAccessories || 0;
  const totalItems = totalPens + totalNotes + totalAccessories;
  const laneCount = Math.max(1, level.lanes || 1);

  const typeQueue = [];
  for (let i = 0; i < totalPens; i++) typeQueue.push('Pen');
  for (let i = 0; i < totalNotes; i++) typeQueue.push('Note');
  for (let i = 0; i < totalAccessories; i++) typeQueue.push('Accessory');

  const columns = Math.ceil(totalItems / laneCount);
  const xSpacing = 74;
  const laneOffsets = [0, 0, 0];

  for (let lane = 0; lane < laneCount; lane++) {
    for (let col = 0; col < columns; col++) {
      const i = lane * columns + col;
      if (i >= totalItems) continue;
      const type = typeQueue[i];
      const t = TYPES.find(x => x.key === type);
      const x = 18 + col * xSpacing;
      const y = LANE_Y[lane] + (lane * 2);

      const el = document.createElement('div');
      el.className = 'item';
      el.dataset.type = t.key;
      el.textContent = t.emoji;
      el.style.background = t.color;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.addEventListener('click', () => selectItem(el));
      els.itemsRoot.appendChild(el);

      beltState.push({ el, x, y, type: t.key });
    }
  }

  updateHUD();
}

function selectItem(el) {
  if (!running) return;
  selectedItem = el;
  document.querySelectorAll('.item').forEach(i => i.style.outline = 'none');
  el.style.outline = '4px solid rgba(255,255,255,0.9)';
  el.style.transform = 'scale(1.08)';
  setTimeout(() => {
    if (document.body.contains(el)) el.style.transform = 'scale(1)';
  }, 160);
}

function onBinClick(bin) {
  if (!running || !selectedItem) return;
  const itemType = selectedItem.dataset.type;
  const binType = bin.dataset.type;

  bin.style.transform = 'translateY(-4px)';
  setTimeout(() => bin.style.transform = 'translateY(0)', 120);

  if (itemType === binType) {
    score += 10;
    selectedItem.style.transition = 'transform 0.22s ease, opacity 0.22s ease';
    selectedItem.style.transform = 'translateY(220px) scale(0.9)';
    selectedItem.style.opacity = '0';
    setTimeout(() => selectedItem.remove(), 220);
    beltState = beltState.filter(s => s.el !== selectedItem);
  } else {
    mistakes += 1;
    score = Math.max(0, score - 5);
  }

  selectedItem = null;
  document.querySelectorAll('.item').forEach(i => i.style.outline = 'none');
  updateHUD();

  const level = levels[currentLevelIndex] || levels[0];
  if (mistakes >= (level.allowedMistakes || 5)) {
    showEnd(false);
    return;
  }

  if (document.querySelectorAll('.item').length === 0) {
    showEnd(true);
  }
}

function loop() {
  if (!running) {
    requestAnimationFrame(loop);
    return;
  }

  const belt = document.querySelector('.belt');
  if (belt) {
    const beltWidth = belt.clientWidth;
    beltState.forEach(s => {
      if (!document.body.contains(s.el)) return;
      s.x += 0.35;
      s.el.style.left = s.x + 'px';
      s.el.style.top = s.y + 'px';
      if (s.x > beltWidth - 78) {
        s.x = 18;
        s.el.style.left = s.x + 'px';
      }
    });
  }

  requestAnimationFrame(loop);
}

function showEnd(success) {
  running = false;
  els.endPanel.classList.remove('hidden');
  els.endTitle.textContent = success ? 'Livello completato!' : 'Ritenta!';
  els.endSubtitle.textContent = success ? `Punteggio: ${score}` : `Errori: ${mistakes}`;
}
