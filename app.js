let levels = [];
let currentLevelIndex = 0;
let score = 0;
let mistakes = 0;
let selectedItem = null;
let beltState = [];
let running = false;

const TYPES = [
  { key: 'Pen', emoji: '✏️', color: '#ffd85f' },
  { key: 'Note', emoji: '🗒️', color: '#ff9dca' },
  { key: 'Accessory', emoji: '📎', color: '#8ee7b3' }
];

const els = {};
let LANE_Y = [];

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

  await loadLevels();
  setupBins();
  setupNextButton();
  computeLaneY();
  startLevel(0);
  running = true;
  requestAnimationFrame(loop);
});

function computeLaneY() {
  const beltHeight = els.belt.clientHeight;
  const itemSize = 58;
  const margin = 6;
  LANE_Y = [
    margin,
    beltHeight / 2 - itemSize / 2,
    beltHeight - itemSize - margin
  ];
}

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

  const typeQueue = [];
  for (let i = 0; i < (level.targetPens||0); i++) typeQueue.push('Pen');
  for (let i = 0; i < (level.targetNotes||0); i++) typeQueue.push('Note');
  for (let i = 0; i < (level.targetAccessories||0); i++) typeQueue.push('Accessory');

  const laneCount = 3; // forziamo sempre 3 righe visibili indipendentemente dal livello
  const xSpacing = 78;
  const startX = 14;

  const perLane = [[],[],[]];
  typeQueue.forEach((type, i) => {
    perLane[i % laneCount].push(type);
  });

  for (let lane = 0; lane < laneCount; lane++) {
    perLane[lane].forEach((type, col) => {
      const t = TYPES.find(x => x.key === type);
      const x = startX + col * xSpacing;
      const y = LANE_Y[lane];

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
    });
  }

  updateHUD();
}

function selectItem(el) {
  if (!running) return;
  selectedItem = el;
  document.querySelectorAll('.item').forEach(i => i.style.outline = 'none');
  el.style.outline = '4px solid rgba(255,255,255,0.9)';
}

function onBinClick(bin) {
  if (!running || !selectedItem) return;
  const itemType = selectedItem.dataset.type;
  const binType = bin.dataset.type;

  if (itemType === binType) {
    score += 10;
    selectedItem.remove();
    beltState = beltState.filter(s => s.el !== selectedItem);
  } else {
    mistakes += 1;
    score = Math.max(0, score - 5);
  }

  selectedItem = null;
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
  const beltWidth = els.belt.clientWidth;
  beltState.forEach(s => {
    if (!document.body.contains(s.el)) return;
    s.x += 0.4;
    if (s.x > beltWidth - 64) s.x = 14;
    s.el.style.left = s.x + 'px';
  });
  requestAnimationFrame(loop);
}

function showEnd(success) {
  running = false;
  els.endPanel.classList.remove('hidden');
  els.endTitle.textContent = success ? 'Livello completato!' : 'Ritenta!';
  els.endSubtitle.textContent = success ? `Punteggio: ${score}` : `Errori: ${mistakes}`;
}
