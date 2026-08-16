const POLL_INTERVAL_MS = 4000;

const params = new URLSearchParams(window.location.search);
const boardId = (params.get('id') || '').toUpperCase();

const gridEl = document.getElementById('grid');
const progressEl = document.getElementById('progress-text');
const winBanner = document.getElementById('win-banner');
const errorBanner = document.getElementById('error-banner');
const resetBtn = document.getElementById('reset-btn');
const copyLinkBtn = document.getElementById('copy-link');
const boardCodeEl = document.getElementById('board-code');

let record = null; // { id, title, subtitle, items, checked }
let pendingIds = new Set(); // items with an optimistic update in flight
let optimistic = {}; // itemId -> checked value we're showing ahead of the server confirming it
let pollTimer = null;

// Requests can resolve out of order (a poll started before a click can
// finish after that click's own response). Tagging each request with a
// sequence number at send-time — and only ever applying the highest one
// seen — stops a stale response from overwriting a fresher one.
let seqCounter = 0;
let latestAppliedSeq = 0;
function shouldApply(seq) {
  if (seq <= latestAppliedSeq) return false;
  latestAppliedSeq = seq;
  return true;
}

function isFreeSpace(item) {
  return item.text.trim().toUpperCase() === 'FREE SPACE';
}

function isEffectivelyChecked(item) {
  if (isFreeSpace(item)) return true;
  if (pendingIds.has(item.id)) return optimistic[item.id];
  return !!record.checked[item.id];
}

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.classList.remove('hidden');
}

function hideError() {
  errorBanner.classList.add('hidden');
}

function render() {
  if (!record) return;

  document.getElementById('board-title').textContent = record.title || 'Bingo';
  document.getElementById('board-subtitle').textContent = record.subtitle || '';
  boardCodeEl.textContent = record.id;

  gridEl.innerHTML = '';
  record.items.forEach((item) => {
    const free = isFreeSpace(item);
    const checked = isEffectivelyChecked(item);

    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cell aspect-square rounded-sm flex items-center justify-center p-2 sm:p-3 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-orange';
    cell.setAttribute('data-checked', checked ? 'true' : 'false');
    if (free || pendingIds.has(item.id)) cell.disabled = true;

    cell.innerHTML = `
      <span class="cell-text relative z-0 font-body text-[11px] sm:text-xs leading-snug text-ink transition-opacity duration-150">${item.text}</span>
      <span class="stamp-mark">
        <span class="stamp-ring w-[85%] h-[85%] flex flex-col items-center justify-center text-[8px] sm:text-[9px] font-medium">
          <span>GEZIEN</span>
          <span class="text-[7px] sm:text-[8px] opacity-70">&#10003;</span>
        </span>
      </span>
    `;

    if (!free) {
      cell.addEventListener('click', () => toggleItem(item.id));
    }

    gridEl.appendChild(cell);
  });

  updateProgress();
  checkForBingo();
}

function updateProgress() {
  const total = record.items.length;
  const checkedCount = record.items.filter((item) => isEffectivelyChecked(item)).length;
  progressEl.textContent = `${checkedCount} / ${total} stamped`;
}

function getCheckedGrid() {
  const matrix = [];
  for (let r = 0; r < 5; r++) {
    const row = [];
    for (let c = 0; c < 5; c++) {
      const item = record.items[r * 5 + c];
      row.push(isEffectivelyChecked(item));
    }
    matrix.push(row);
  }
  return matrix;
}

function checkForBingo() {
  if (record.items.length !== 25) {
    winBanner.classList.add('hidden');
    return;
  }
  const m = getCheckedGrid();
  let hasLine = false;
  for (let r = 0; r < 5; r++) if (m[r].every(Boolean)) hasLine = true;
  for (let c = 0; c < 5; c++) if (m.every((row) => row[c])) hasLine = true;
  if ([0, 1, 2, 3, 4].every((i) => m[i][i])) hasLine = true;
  if ([0, 1, 2, 3, 4].every((i) => m[i][4 - i])) hasLine = true;
  winBanner.classList.toggle('hidden', !hasLine);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const pageLoadedAt = Date.now();
const NOT_FOUND_GRACE_MS = 15000; // give a freshly created board up to 15s to become readable
const RETRY_DELAY_MS = 1000;

async function fetchBoard({ silent } = {}) {
  if (silent && pendingIds.size > 0) return; // don't let a background poll race an in-flight toggle
  const seq = ++seqCounter;
  try {
    const res = await fetch(`/.netlify/functions/board?id=${encodeURIComponent(boardId)}`);

    // A board that was just created can take a moment to become readable.
    // Retry quietly, for as long as we're still within the grace period and
    // haven't successfully loaded a board yet — rather than flashing "not
    // found" while it catches up.
    if (res.status === 404 && !record && Date.now() - pageLoadedAt < NOT_FOUND_GRACE_MS) {
      await delay(RETRY_DELAY_MS);
      return fetchBoard({ silent });
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Board not found.');
    }
    const data = await res.json();
    if (!shouldApply(seq)) return; // a newer request already updated the view
    record = data;
    hideError();
    render();
  } catch (err) {
    if (!silent) showError(err.message);
    else console.warn('Poll failed:', err.message);
  }
}

async function toggleItem(itemId) {
  if (pendingIds.has(itemId)) return; // already mid-toggle, ignore extra taps

  const item = record.items.find((i) => i.id === itemId);
  const current = isEffectivelyChecked(item);

  optimistic[itemId] = !current;
  pendingIds.add(itemId);
  render();

  const seq = ++seqCounter;
  try {
    const res = await fetch(`/.netlify/functions/board?action=toggle&id=${encodeURIComponent(boardId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Could not save that.');
    }
    const data = await res.json();
    if (shouldApply(seq)) record = data;
  } catch (err) {
    showError(err.message);
  } finally {
    pendingIds.delete(itemId);
    delete optimistic[itemId];
    render();
  }
}

async function resetBoard() {
  if (!confirm('Reset this board for everyone playing?')) return;
  const seq = ++seqCounter;
  try {
    const res = await fetch(`/.netlify/functions/board?action=reset&id=${encodeURIComponent(boardId)}`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Could not reset the board.');
    }
    const data = await res.json();
    if (shouldApply(seq)) {
      record = data;
      render();
    }
  } catch (err) {
    showError(err.message);
  }
}

function copyLink() {
  const url = `${window.location.origin}${window.location.pathname}?id=${boardId}`;
  navigator.clipboard.writeText(url).then(
    () => {
      copyLinkBtn.textContent = 'copied!';
      setTimeout(() => (copyLinkBtn.textContent = 'copy link'), 1500);
    },
    () => {
      prompt('Copy this link:', url);
    }
  );
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => fetchBoard({ silent: true }), POLL_INTERVAL_MS);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') fetchBoard({ silent: true });
});

resetBtn.addEventListener('click', resetBoard);
copyLinkBtn.addEventListener('click', copyLink);

if (!boardId || boardId.length !== 6) {
  showError('No board code in the link. Go back and create or join a board.');
} else {
  fetchBoard().then(startPolling);
}
