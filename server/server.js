const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Papa = require('papaparse');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, '../dist')));

const readPuzzleFromCSV = () => {
  const csvPath = path.join(__dirname, 'puzzle.csv');
  const file = fs.readFileSync(csvPath, 'utf8');
  const parsed = Papa.parse(file, { header: true });
  const { theme, spanagram, words, decoys } = parsed.data[0];

  const wordList = words.split(',').map(w => w.trim().toUpperCase());
  const decoyList = decoys ? decoys.split(',').map(w => w.trim().toUpperCase()) : [];

  return {
    theme,
    spanagram: spanagram.trim().toUpperCase(),
    words: wordList,
    decoys: decoyList
  };
};

const createGrid = (words, size = 8) => {
  const grid = Array(size).fill().map(() => Array(size).fill(''));
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [-1, 1], [1, -1], [1, 1]
  ];

  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const isInBounds = (r, c) => r >= 0 && r < size && c >= 0 && c < size;

  const placeWordCurved = (word) => {
    const maxAttempts = 200;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let r = Math.floor(Math.random() * size);
      let c = Math.floor(Math.random() * size);
      if (grid[r][c] !== '') continue;

      const path = [[r, c]];
      grid[r][c] = word[0];

      for (let i = 1; i < word.length; i++) {
        const [lastR, lastC] = path[path.length - 1];
        const shuffledDirs = shuffle([...directions]);

        let placed = false;
        for (const [dr, dc] of shuffledDirs) {
          const nr = lastR + dr;
          const nc = lastC + dc;
          if (
            isInBounds(nr, nc) &&
            grid[nr][nc] === '' &&
            !path.some(([pr, pc]) => pr === nr && pc === nc)
          ) {
            grid[nr][nc] = word[i];
            path.push([nr, nc]);
            placed = true;
            break;
          }
        }

        if (!placed) {
          for (const [rr, cc] of path) {
            grid[rr][cc] = '';
          }
          break;
        }

        if (i === word.length - 1) return true;
      }
    }
    return false;
  };

  words.forEach(word => placeWordCurved(word.toUpperCase()));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      }
    }
  }

  return grid.flat();
};

app.get('/api/puzzle', (req, res) => {
  const { theme, spanagram, words, decoys } = readPuzzleFromCSV();
  const grid = createGrid([spanagram, ...words, ...decoys]);
  res.json({ theme, spanagram, words, decoys, grid });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
