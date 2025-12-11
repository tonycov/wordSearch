// Utility: async load words.txt as word|clue pairs
async function loadWordsAndClues() {
  const resp = await fetch('words.txt');
  const text = await resp.text();
  return text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length && line.includes('|'))
    .map(line => {
      const [word, clue] = line.split('|');
      return { word: word.trim(), clue: clue.trim() };
    });
}

// Generate a grid with the target words and fill the rest with random letters
function generateGrid(words, size = words.length) {
  // Directions: horizontal, vertical, diagonal (all 8)
  const directions = [
    { dx: 1, dy: 0 },  // right
    { dx: 0, dy: 1 },  // down
    { dx: 1, dy: 1 },  // down-right
    { dx: -1, dy: 1 }, // down-left
    { dx: -1, dy: 0 }, // left
    { dx: 0, dy: -1 }, // up
    { dx: -1, dy: -1 },// up-left
    { dx: 1, dy: -1 }  // up-right
  ];
  let grid = Array(size).fill(0).map(() => Array(size).fill(''));
  for (let { word } of words) {
    word = word.toUpperCase();
    let attempts = 0, placedWord = false;
    while (attempts < 200 && !placedWord) {
      attempts++;
      let dir = directions[Math.floor(Math.random() * directions.length)];
      let row = Math.floor(Math.random() * size);
      let col = Math.floor(Math.random() * size);
      // Check if word fits
      let fits = true;
      for (let i = 0; i < word.length; i++) {
        let r = row + dir.dy * i, c = col + dir.dx * i;
        if (r < 0 || r >= size || c < 0 || c >= size ||
          (grid[r][c] && grid[r][c] !== word[i])) {
          fits = false; break;
        }
      }
      if (!fits) continue;
      // Place word
      for (let i = 0; i < word.length; i++) {
        let r = row + dir.dy * i, c = col + dir.dx * i;
        grid[r][c] = word[i];
      }
      placedWord = true;
    }
    if (!placedWord) {
      console.warn('Failed to place word:', word);
    }
  }
  // Fill empty
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!grid[r][c]) grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
  return grid;
}

function renderGrid(grid) {
  const wordsearch = document.getElementById('wordsearch');
  wordsearch.innerHTML = '';
  wordsearch.style.gridTemplateColumns = `repeat(${grid.length}, 1fr)`;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid.length; c++) {
      let cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.textContent = grid[r][c];
      wordsearch.appendChild(cell);
    }
  }
}

// Render clues only, not answers
function renderClues(words, foundWords = []) {
  const ul = document.getElementById('clues-list');
  ul.innerHTML = '';
  words.forEach(({ word, clue }) => {
    let li = document.createElement('li');
    li.id = 'clue-' + word.toLowerCase();
    if (foundWords.includes(word)) {
      li.innerHTML = `${clue}: <b>${word}</b>`;
    } else {
      li.textContent = clue;
    }
    ul.appendChild(li);
  });
}

function renderFound(found) {
  const ul = document.getElementById('found-list');
  ul.innerHTML = '';
  found.forEach(w => {
    let li = document.createElement('li');
    li.textContent = w;
    ul.appendChild(li);
  });
}

function getWordFromCells(cells, grid) {
  return cells.map(([r, c]) => grid[r][c]).join('');
}

function checkSelection(cells, words, grid) {
  let str = getWordFromCells(cells, grid);
  let rev = str.split('').reverse().join('');
  for (let { word } of words) {
    if (str === word.toUpperCase() || rev === word.toUpperCase())
      return word;
  }
  return null;
}

function highlightCells(cells, className) {
  for (let [r, c] of cells) {
    let q = `.cell[data-row="${r}"][data-col="${c}"]`;
    let el = document.querySelector(q);
    if (el) el.classList.add(className);
  }
}

function clearSelection() {
  document.querySelectorAll('.cell.selected').forEach(e => e.classList.remove('selected'));
}

// Legal move logic: checks if cells are in a straight line in a valid direction
function isLegalPath(cells) {
  if (!cells || cells.length === 0) return false;
  if (cells.length === 1) return true;
  const [r0, c0] = cells[0];
  const [r1, c1] = cells[1];
  const dr = r1 - r0;
  const dc = c1 - c0;
  // Normalize step to -1/0/1
  const stepR = Math.sign(dr);
  const stepC = Math.sign(dc);
  // Must move at most 1 in row/col for adjacent cells
  if (Math.abs(dr) > 1 || Math.abs(dc) > 1) return false;
  // Subsequent cells must keep same step
  for (let i = 1; i < cells.length; i++) {
    const [pr, pc] = cells[i - 1];
    const [cr, cc] = cells[i];
    if ((cr - pr) !== stepR || (cc - pc) !== stepC) return false;
  }
  return true;
}

// --- Fireworks Animation (simple placeholder) ---
function startFireworks(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.clientWidth || 400;
  canvas.height = canvas.clientHeight || 200;
  // Simple blink to give some visual feedback while overlay is visible
  let visible = true;
  let count = 0;
  const iv = setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (visible) {
      ctx.fillStyle = 'rgba(255,200,0,0.9)';
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 40 + (count % 3) * 6, 0, Math.PI * 2);
      ctx.fill();
    }
    visible = !visible;
    count++;
    if (count > 6) {
      clearInterval(iv);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, 300);
}

// --- Overlay Logic ---
function showCongratsOverlay(words) {
  const overlay = document.getElementById('overlay-congrats');
  const wordList = document.getElementById('overlay-words');
  const canvas = document.getElementById('fireworks-canvas');
  overlay.classList.remove('hidden');
  wordList.innerHTML = '';
  words.forEach(w => {
    let li = document.createElement('li');
    li.textContent = w;
    wordList.appendChild(li);
  });
  startFireworks(canvas);

  // Copy/download logic
  document.getElementById('copy-btn').onclick = () => {
    const text = words.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      document.getElementById('copy-btn').textContent = 'Copied!';
      setTimeout(() => document.getElementById('copy-btn').textContent = 'Copy Words', 1200);
    });
  };
  document.getElementById('download-btn').onclick = () => {
    const text = words.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'found-words.txt';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };
  document.getElementById('close-btn').onclick = () => {
    overlay.classList.add('hidden');
  };

  // After a short pause, redirect to the static congrats page
  // (gives the overlay a moment to appear so user sees celebration)
  setTimeout(() => {
    window.location.href = 'congrats.html';
  }, 1600); // 1.6s delay - adjust as desired
}

// Touch/Mouse event handler, only allow legal paths
function addGridEvents(grid, words) {
  let wordsearch = document.getElementById('wordsearch');
  let touchPath = [];
  let selecting = false;
  let foundWords = [];
  let startR = null, startC = null, dirR = null, dirC = null;

  wordsearch.addEventListener('touchstart', function (e) {
    if (e.target.classList.contains('cell')) {
      selecting = true;
      touchPath = [];
      clearSelection();
      startR = parseInt(e.target.dataset.row);
      startC = parseInt(e.target.dataset.col);
      touchPath.push([startR, startC]);
      e.target.classList.add('selected');
      dirR = null; dirC = null;
    }
  }, { passive: false });

  wordsearch.addEventListener('touchmove', function (e) {
    if (selecting && e.touches.length === 1) {
      let touch = e.touches[0];
      let el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (el && el.classList.contains('cell')) {
        let r = parseInt(el.dataset.row), c = parseInt(el.dataset.col);
        if (touchPath.length === 1) {
          dirR = r - startR;
          dirC = c - startC;
          if (Math.abs(dirR) > 1 || Math.abs(dirC) > 1 || (dirR === 0 && dirC === 0)) return;
        }
        if (touchPath.length >= 2) {
          let [prevR, prevC] = touchPath[touchPath.length - 1];
          if ((r - prevR) !== dirR || (c - prevC) !== dirC) return;
        }
        if (!touchPath.some(([rr, cc]) => rr === r && cc === c)) {
          touchPath.push([r, c]);
          el.classList.add('selected');
        }
      }
      e.preventDefault();
    }
  }, { passive: false });

  wordsearch.addEventListener('touchend', function (e) {
    if (!selecting) return;
    selecting = false;
    if (isLegalPath(touchPath)) {
      let w = checkSelection(touchPath, words, grid);
      if (w && !foundWords.includes(w)) {
        foundWords.push(w);
        highlightCells(touchPath, 'found');
        renderClues(words, foundWords);
        renderFound(foundWords);
        // Dynamic check: redirect if we've found all words
        if (foundWords.length === words.length) showCongratsOverlay(foundWords);
      }
    }
    clearSelection();
    touchPath = [];
  });

  // Mouse support for desktop
  wordsearch.addEventListener('mousedown', function (e) {
    if (e.target.classList.contains('cell')) {
      selecting = true;
      touchPath = [];
      clearSelection();
      startR = parseInt(e.target.dataset.row);
      startC = parseInt(e.target.dataset.col);
      touchPath.push([startR, startC]);
      e.target.classList.add('selected');
      dirR = null; dirC = null;
    }
  });

  wordsearch.addEventListener('mousemove', function (e) {
    if (selecting && e.buttons === 1) {
      let el = document.elementFromPoint(e.clientX, e.clientY);
      if (el && el.classList.contains('cell')) {
        let r = parseInt(el.dataset.row), c = parseInt(el.dataset.col);
        if (touchPath.length === 1) {
          dirR = r - startR;
          dirC = c - startC;
          if (Math.abs(dirR) > 1 || Math.abs(dirC) > 1 || (dirR === 0 && dirC === 0)) return;
        }
        if (touchPath.length >= 2) {
          let [prevR, prevC] = touchPath[touchPath.length - 1];
          if ((r - prevR) !== dirR || (c - prevC) !== dirC) return;
        }
        if (!touchPath.some(([rr, cc]) => rr === r && cc === c)) {
          touchPath.push([r, c]);
          el.classList.add('selected');
        }
      }
    }
  });

  window.addEventListener('mouseup', function (e) {
    if (!selecting) return;
    selecting = false;
    if (isLegalPath(touchPath)) {
      let w = checkSelection(touchPath, words, grid);
      if (w && !foundWords.includes(w)) {
        foundWords.push(w);
        highlightCells(touchPath, 'found');
        renderClues(words, foundWords);
        renderFound(foundWords);
        if (foundWords.length === words.length) showCongratsOverlay(foundWords);
      }
    }
    clearSelection();
    touchPath = [];
  });
}

// Main
window.addEventListener('DOMContentLoaded', async function () {
  const wordClues = await loadWordsAndClues();
  const words = wordClues.slice(0, 8); // Only first 8 pairs
  const gridData = generateGrid(words, 8);
  renderGrid(gridData);
  renderClues(words, []);
  renderFound([]);
  addGridEvents(gridData, words);
});
