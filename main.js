// Utility: async load words.txt
async function loadWords() {
  const resp = await fetch('words.txt');
  const text = await resp.text();
  return text.split('\n').map(w => w.trim()).filter(w => w.length);
}

// Generate a grid with the target words and fill the rest with random letters
function generateGrid(words, size = 12) {
  // Directions: horizontal, vertical, diagonal (down-right, down-left)
  const directions = [
    {dx:1,dy:0}, {dx:0,dy:1}, {dx:1,dy:1}, {dx:-1,dy:1}
  ];
  // Create empty grid
  let grid = Array(size).fill(0).map(()=>Array(size).fill(''));
  let placed = [];

  for (let word of words) {
    // Try to place each word randomly
    let attempts = 0;
    let placedWord = false;
    while (attempts < 100 && !placedWord) {
      attempts++;
      let dir = directions[Math.floor(Math.random()*directions.length)];
      let row = Math.floor(Math.random() * size);
      let col = Math.floor(Math.random() * size);

      // Check if word fits
      let fits = true;
      for (let i=0; i<word.length; i++) {
        let r = row + dir.dy*i;
        let c = col + dir.dx*i;
        if (r<0||r>=size||c<0||c>=size|| (grid[r][c] && grid[r][c]!==word[i].toUpperCase())) {
          fits = false; break;
        }
      }
      if (!fits) continue;
      // Place word
      for (let i=0; i<word.length; i++) {
        let r = row + dir.dy*i, c = col + dir.dx*i;
        grid[r][c] = word[i].toUpperCase();
        placed.push({word, cells: [[r,c], ...((i>0) ? placed[placed.length-1].cells : [])]});
      }
      placed.push({word, dir, start:[row,col], length:word.length});
      placedWord = true;
    }
  }
  // Fill empty spots
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for(let r=0;r<size;r++)for(let c=0;c<size;c++)
    if(!grid[r][c])grid[r][c]=letters[Math.floor(Math.random()*letters.length)];
  return grid;
}

function renderGrid(grid) {
  const wordsearch = document.getElementById('wordsearch');
  wordsearch.innerHTML = '';
  wordsearch.style.gridTemplateColumns = `repeat(${grid.length}, 1fr)`;
  for (let r=0; r<grid.length; r++) {
    for (let c=0; c<grid.length; c++) {
      let cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.textContent = grid[r][c];
      wordsearch.appendChild(cell);
    }
  }
}

function renderWords(words) {
  const ul = document.getElementById('words-list');
  ul.innerHTML = '';
  words.forEach(w=>{
    let li = document.createElement('li');
    li.textContent = w;
    li.id = 'tofind-'+w.toLowerCase();
    ul.appendChild(li);
  });
}

function renderFound(found) {
  const ul = document.getElementById('found-list');
  ul.innerHTML = '';
  found.forEach(w=>{
    let li = document.createElement('li');
    li.textContent = w;
    ul.appendChild(li);
  });
}

// Touch selection logic
let touchPath = [];
let selecting = false;
let foundWords = [];
let allWords = [];
let gridData = [];
let wordPositions = {};

function getWordFromCells(cells, grid) {
  return cells.map(([r,c])=>grid[r][c]).join('');
}

function checkSelection(cells, words, grid) {
  let str = getWordFromCells(cells, grid);
  let rev = str.split('').reverse().join('');
  for(let w of words) {
    if(str===w.toUpperCase()||rev===w.toUpperCase()) return w;
  }
  return null;
}

function highlightCells(cells, className) {
  for(let [r,c] of cells) {
    let q = `.cell[data-row="${r}"][data-col="${c}"]`;
    let el = document.querySelector(q);
    if(el) el.classList.add(className);
  }
}

function clearSelection() {
  document.querySelectorAll('.cell.selected').forEach(e=>e.classList.remove('selected'));
}

function showCongrats(words) {
  const congrats = document.getElementById('congrats');
  congrats.classList.remove('hidden');
  congrats.innerHTML = `<strong>Congratulations!</strong><br>You found all 8 words:<br>${words.map(w=>`<span>${w}</span>`).join(', ')}`;
}

// Touch/Mouse event handler
function addGridEvents(grid, words) {
  const size = grid.length;
  let wordsearch = document.getElementById('wordsearch');
  let startCell = null;
  wordsearch.addEventListener('touchstart', function(e){
    if(e.target.classList.contains('cell')) {
      selecting = true;
      touchPath = [];
      clearSelection();
      startCell = e.target;
      let r = parseInt(e.target.dataset.row), c = parseInt(e.target.dataset.col);
      touchPath.push([r,c]);
      e.target.classList.add('selected');
    }
  }, {passive:false});
  wordsearch.addEventListener('touchmove', function(e){
    if(selecting && e.touches.length===1) {
      let touch = e.touches[0];
      let el = document.elementFromPoint(touch.clientX, touch.clientY);
      if(el && el.classList.contains('cell')) {
        let r = parseInt(el.dataset.row), c = parseInt(el.dataset.col);
        let last = touchPath[touchPath.length-1];
        // Only allow straight lines for selection
        if (!touchPath.some(([rr,cc])=>rr===r&&cc===c)) {
          if(touchPath.length===1 || (Math.abs(r-last[0])<=1 && Math.abs(c-last[1])<=1)) {
            touchPath.push([r,c]);
            el.classList.add('selected');
          }
        }
      }
      e.preventDefault();
    }
  }, {passive:false});
  wordsearch.addEventListener('touchend', function(e){
    if(!selecting) return;
    selecting = false;
    let w = checkSelection(touchPath, words, grid);
    if(w && !foundWords.includes(w)) {
      foundWords.push(w);
      highlightCells(touchPath, 'found');
      document.getElementById('tofind-'+w.toLowerCase()).style.textDecoration = "line-through";
      renderFound(foundWords);
      if(foundWords.length===8) showCongrats(foundWords);
    }
    clearSelection();
    touchPath = [];
  });

  // Mouse support for desktop
  wordsearch.addEventListener('mousedown', function(e){
    if(e.target.classList.contains('cell')) {
      selecting = true;
      touchPath = [];
      clearSelection();
      let r = parseInt(e.target.dataset.row), c = parseInt(e.target.dataset.col);
      touchPath.push([r,c]);
      e.target.classList.add('selected');
    }
  });
  wordsearch.addEventListener('mousemove', function(e){
    if(selecting && e.buttons===1) {
      let el = document.elementFromPoint(e.clientX, e.clientY);
      if(el && el.classList.contains('cell')) {
        let r = parseInt(el.dataset.row), c = parseInt(el.dataset.col);
        let last = touchPath[touchPath.length-1];
        if (!touchPath.some(([rr,cc])=>rr===r&&cc===c)) {
          if(touchPath.length===1 || (Math.abs(r-last[0])<=1 && Math.abs(c-last[1])<=1)) {
            touchPath.push([r,c]);
            el.classList.add('selected');
          }
        }
      }
    }
  });
  window.addEventListener('mouseup', function(e){
    if(!selecting) return;
    selecting = false;
    let w = checkSelection(touchPath, words, grid);
    if(w && !foundWords.includes(w)) {
      foundWords.push(w);
      highlightCells(touchPath, 'found');
      document.getElementById('tofind-'+w.toLowerCase()).style.textDecoration = "line-through";
      renderFound(foundWords);
      if(foundWords.length===8) showCongrats(foundWords);
    }
    clearSelection();
    touchPath = [];
  });
}

// Main
window.addEventListener('DOMContentLoaded', async function(){
  allWords = await loadWords();
  if(allWords.length>8) allWords = allWords.slice(0,8);
  gridData = generateGrid(allWords);
  renderGrid(gridData);
  renderWords(allWords);
  renderFound(foundWords);
  addGridEvents(gridData, allWords);
});