const AMSTERDAM_PRESET = [
  'Buy yarn at De Afstap',
  'Get lost down a canal street',
  'Find a chunky A5 notebook',
  'Coffee before 9am',
  'Bike bell rings at you',
  'Stroopwafel, fresh off the griddle',
  'Browse Stephen & Penelope',
  'Photograph a gabled façade',
  'Someone speaks Dutch, you nod anyway',
  'Fries with mayo, not ketchup',
  'Yarnhugs haul',
  'Sunburn from a full day outside',
  'Spot orange head to toe',
  'Market stall find (Albert Cuyp?)',
  'Write a postcard',
  'Tram, correctly boarded',
  'Engine noise you can feel in your chest',
  'Orange smoke at Zandvoort',
  "New notebook's first page filled",
  'Rain, brief and unbothered',
  'Grandstand singalong',
  'A plane you can actually identify',
  "Someone asks 'first time at the GP?'",
  'Wrong turn, right view',
];

const joinForm = document.getElementById('join-form');
const joinCodeInput = document.getElementById('join-code');
const joinError = document.getElementById('join-error');

const createForm = document.getElementById('create-form');
const titleInput = document.getElementById('board-title');
const subtitleInput = document.getElementById('board-subtitle');
const itemsTextarea = document.getElementById('board-items');
const lineCountEl = document.getElementById('line-count');
const usePresetBtn = document.getElementById('use-preset');
const createBtn = document.getElementById('create-btn');
const createError = document.getElementById('create-error');

function getLines() {
  return itemsTextarea.value
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function updateLineCount() {
  const count = getLines().length;
  lineCountEl.textContent = `${count} / 24 lines`;
  lineCountEl.classList.toggle('text-orange', count === 24);
  lineCountEl.classList.toggle('text-ink/40', count !== 24);
}

itemsTextarea.addEventListener('input', updateLineCount);

usePresetBtn.addEventListener('click', () => {
  itemsTextarea.value = AMSTERDAM_PRESET.join('\n');
  updateLineCount();
});

joinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const code = joinCodeInput.value.trim().toUpperCase();
  joinError.classList.add('hidden');
  if (code.length !== 6) {
    joinError.textContent = 'Codes are 6 characters.';
    joinError.classList.remove('hidden');
    return;
  }
  window.location.href = `board.html?id=${encodeURIComponent(code)}`;
});

createForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  createError.classList.add('hidden');

  const lines = getLines();
  if (lines.length !== 24) {
    createError.textContent = `Need exactly 24 lines (you have ${lines.length}). A free space fills the center automatically.`;
    createError.classList.remove('hidden');
    return;
  }

  // build 25 items with FREE SPACE inserted at the center (index 12)
  const items = [];
  let cursor = 0;
  for (let i = 0; i < 25; i++) {
    if (i === 12) {
      items.push({ id: i + 1, text: 'FREE SPACE' });
    } else {
      items.push({ id: i + 1, text: lines[cursor] });
      cursor++;
    }
  }

  createBtn.disabled = true;
  createBtn.textContent = 'Creating…';

  try {
    const res = await fetch('/.netlify/functions/board?action=create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: titleInput.value.trim() || 'Bingo',
        subtitle: subtitleInput.value.trim(),
        items,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Could not create the board.');
    }

    const record = await res.json();
    window.location.href = `board.html?id=${encodeURIComponent(record.id)}`;
  } catch (err) {
    createError.textContent = err.message;
    createError.classList.remove('hidden');
    createBtn.disabled = false;
    createBtn.textContent = 'Create board';
  }
});
