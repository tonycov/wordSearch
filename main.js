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
function generateGrid(words, size = 8) {
  // Directions: horizontal, vertical, diagonal (down-right, down-left)
  const directions = [
    { dx: 1, dy: 0 }, // right
    { dx: 0, dy: 1 }, // down
    { dx: 1, dy: 1 }, // down-right
    { dx: -1, dy: 1 }, // down-left
    { dx: -1, dy: 0 }, // left
    { dx: 0, dy: -1 }, // up
    { dx: -1, dy: -1 }, // up-left
    { dx: 1, dy: -1 } // up-right
  ];
  let grid = Array(size).fill(0).map(() => Array(size).fill(''));
  for (let { word } of words) {
    let attempts = 0, placedWord = false;
    while (attempts < 100 && !placedWord) {
      attempts++;
      let dir = directions[Math.floor(Math.random() * directions.length)];
      let row = Math.floor(Math.random() * size);
      let col = Math.floor(Math.random() * size);
      // Check if word fits
      let fits = true;
      for (let i = 0; i < word.length; i++) {
        let r = row + dir.dy * i, c = col + dir.dx * i;
        if (r < 0 || r >= size || c < 0 || c >= size ||
          (grid[r][c] && grid[r][c] !== word[i].toUpperCase())) {
          fits = false; break;
        }
      }
      if (!fits) continue;
      // Place word
      for (let i = 0; i < word.length; i++) {
        let r = row + dir.dy * i, c = col + dir.dx * i;
        grid[r][c] = word[i].toUpperCase();
      }
      placedWord = true;
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
  if (cells.length < 2) return true;
  let [r0, c0] = cells[0];
  let [r1, c1] = cells[1];
  let dr = r1 - r0, dc = c1 - c0;
  // Direction must be -1, 0, or 1 for both row and col (for diagonals)
  if (Math.abs(dr) > 1 || Math.abs(dc) > 1 || (dr === 0 && dc === 0)) return false;
  // Get the direction for the path
  let dirR = dr, dirC = dc;
  for (let i = 2; i < cells.length; i++) {
    let [prevR, prevC] = cells[i - 1];
    let [currR, currC] = cells[i];
    if ((currR - prevR) !== dirR || (currC - prevC) !== dirC) return false;
  }
  return true;
}

function showCongrats(words) {
  const congrats = document.getElementById('congrats');
  congrats.classList.remove('hidden');
  congrats.innerHTML = `<strong>Congratulations!</strong><br>You found all 8 words:<br>${words.map(w => `<span>${w}</span>`).join(', ')}`;
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
        // If second cell, establish direction
        if (touchPath.length === 1) {
          dirR = r - startR;
          dirC = c - startC;
          // Must be a valid direction
          if (Math.abs(dirR) > 1 || Math.abs(dirC) > 1 || (dirR === 0 && dirC === 0)) return;
        }
        // Only allow if cell is next in the established direction
        if (touchPath.length >= 2) {
          let [prevR, prevC] = touchPath[touchPath.length - 1];
          if ((r - prevR) !== dirR || (c - prevC) !== dirC) return;
        }
        // Don't add duplicates
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
    // Only legal path
    if (isLegalPath(touchPath)) {
      let w = checkSelection(touchPath, words, grid);
      if (w && !foundWords.includes(w)) {
        foundWords.push(w);
        highlightCells(touchPath, 'found');
        renderClues(words, foundWords);
        renderFound(foundWords);
        if (foundWords.length === 8) showCongrats(foundWords);
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
        if (foundWords.length === 8) showCongrats(foundWords);
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