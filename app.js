let levels = [];
let currentLevelIndex = 0;
let score = 0;
let mistakes = 0;

document.addEventListener('DOMContentLoaded', async () => {
  await loadLevels();
  setupGame();
  startLevel(0);
});

async function loadLevels() {
  const res = await fetch('levels.json');
  const data = await res.json();
  levels = data.levels || [];
}

function setupGame() {
  const bins = Array.from(document.querySelectorAll('.bin'));
  const scoreChip = document.getElementById('scoreChip');
  const nextBtn = document.getElementById('nextLevelBtn');
  const endPanel = document.getElementById('endPanel');

  bins.forEach(bin => {
    bin.addEventListener('click', () => onBinClick(bin));
  });

  nextBtn.addEventListener('click', () => {
    endPanel.classList.add('hidden');
    if (currentLevelIndex < levels.length - 1) {
      startLevel(currentLevelIndex + 1);
    } else {
      startLevel(0);
    }
  });

  function updateScore() {
    scoreChip.textContent = '⭐ ' + score;
  }

  window._updateScore = updateScore;
}

let selectedItem = null;
let beltState = [];
let beltSpeed = 18;

function startLevel(index) {
  currentLevelIndex = index;
  const level = levels[index] || levels[0];
  score = 0;
  mistakes = 0;
  selectedItem = null;

  const levelLabel = document.getElementById('levelLabel');
  const objectiveText = document.getElementById('objectiveText');
  levelLabel.textContent = String(level.level);
  objectiveText.textContent = `Smista ${level.targetPens} penne, ${level.targetNotes} note, ${level.targetAccessories} accessori`;

  const itemsRoot = document.getElementById('itemsRoot');
  itemsRoot.innerHTML = '';

  const types = [
    { key:'Pen', emoji:'✏️', color:'#ffd85f' },
    { key:'Note', emoji:'🗒️', color:'#ff9dca' },
    { key:'Accessory', emoji:'📎', color:'#8ee7b3' }
  ];

  const totalItems = level.targetPens + level.targetNotes + level.targetAccessories;
  beltSpeed = 40 * level.beltSpeed;

  beltState = [];

  for (let i = 0; i < totalItems; i++) {
    const tIndex = i % types.length;
    const t = types[tIndex];
    const lane = i % level.lanes;
    const yBase = 22 + lane * 120;

    const el = document.createElement('div');
    el.className = 'item';
    el.dataset.type = t.key;
    el.textContent = t.emoji;
    el.style.background = t.color;
    el.style.left = (20 + i * 24) + 'px';
    el.style.top = yBase + 'px';
    el.addEventListener('click', () => selectItem(el));
    itemsRoot.appendChild(el);

    beltState.push({
      el,
      x: 20 + i * 24,
      lane
    });
  }

  window._updateScore();
  if (!window._loopRunning) {
    window._loopRunning = true;
    requestAnimationFrame(loop);
  }
}

function selectItem(el) {
  selectedItem = el;
  document.querySelectorAll('.item').forEach(i => i.style.outline = 'none');
  el.style.outline = '4px solid rgba(255,255,255,0.9)';
  el.style.transform += ' scale(1.06)';
  setTimeout(() => {
    el.style.transform = el.style.transform.replace(' scale(1.06)','');
  }, 200);
}

function onBinClick(bin) {
  if (!selectedItem) return;
  const iconType = selectedItem.dataset.type;
  const binType = bin.dataset.type;

  bin.style.transform = 'translateY(-4px)';
  setTimeout(() => bin.style.transform = 'translateY(0)', 120);

  const level = levels[currentLevelIndex] || levels[0];

  if (iconType === binType) {
    score += 10;
    selectedItem.style.transform += ' translateY(220px)';
    selectedItem.style.opacity = '0';
    setTimeout(() => selectedItem.remove(), 280);
  } else {
    mistakes += 1;
    score = Math.max(0, score - 5);
  }

  selectedItem = null;
  document.querySelectorAll('.item').forEach(i => i.style.outline = 'none');
  window._updateScore();

  if (mistakes >= level.allowedMistakes) {
    showEnd(false);
  } else {
    if (document.querySelectorAll('.item').length === 0) {
      showEnd(true);
    }
  }
}

function loop(ts) {
  const belt = document.querySelector('.belt');
  if (!belt) return;

  beltState.forEach(s => {
    if (!document.body.contains(s.el)) return;
    s.x += beltSpeed * (1/60); // approx 60fps
    s.el.style.left = s.x + 'px';
    if (s.x > (belt.clientWidth - 34)) {
      s.x = 20;
      s.el.style.left = s.x + 'px';
    }
  });

  requestAnimationFrame(loop);
}

function showEnd(success) {
  const endPanel = document.getElementById('endPanel');
  const title = document.getElementById('endTitle');
  const subtitle = document.getElementById('endSubtitle');
  endPanel.classList.remove('hidden');
  title.textContent = success ? 'Livello completato!' : 'Ritenta!';
  subtitle.textContent = success
    ? `Punteggio: ${score}`
    : `Errori: ${mistakes}`;
}