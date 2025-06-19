import { useEffect, useState, useRef } from 'react';

export default function App() {
  const [theme, setTheme] = useState('');
  const [spanagram, setSpanagram] = useState('');
  const [validWords, setValidWords] = useState([]);
  const [decoys, setDecoys] = useState([]);
  const [grid, setGrid] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [foundWords, setFoundWords] = useState([]);
  const [highlightedPaths, setHighlightedPaths] = useState([]);
  const [message, setMessage] = useState('');
  const [dictionary, setDictionary] = useState(new Set());
  const tileRefs = useRef({});

  useEffect(() => {
    fetch('/api/puzzle')
      .then(res => res.json())
      .then(data => {
        setTheme(data.theme);
        setSpanagram(data.spanagram.toLowerCase());
        setValidWords(data.words.map(w => w.toLowerCase()));
        setDecoys(data.decoys.map(w => w.toLowerCase()));
        setGrid(data.grid);
      });
    fetch('/words_alpha.txt')
    .then(res => res.text())
    .then(text => {
      const wordSet = new Set(text.split('\n').map(w => w.trim().toLowerCase()));
      setDictionary(wordSet);
    });
  }, []);
  useEffect(() => {
  if (message) {
    const timeout = setTimeout(() => setMessage(''), 2000);
    return () => clearTimeout(timeout);
  }
}, [message]);

  const startSelect = (index) => {
    setIsSelecting(true);
    setSelectedIndices([index]);
  };

  const continueSelect = (index) => {
    if (!isSelecting || selectedIndices.includes(index)) return;
    const lastIndex = selectedIndices[selectedIndices.length - 1];
    if (checkAdjacency(lastIndex, index)) {
      setSelectedIndices([...selectedIndices, index]);
    }
  };

  const checkAdjacency = (a, b) => {
    const size = 8;
    const r1 = Math.floor(a / size), c1 = a % size;
    const r2 = Math.floor(b / size), c2 = b % size;
    return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1;
  };

  const isValidEnglishWord = (word) => {
    return dictionary.has(word.toLowerCase());
    };

  const endSelect = async () => {
  const word = selectedIndices.map(i => grid[i]).join('').toLowerCase();
  if (word.length < 4) {
    setMessage("Too short");
    setSelectedIndices([]);
    setIsSelecting(false);
    return;
  }

  if (foundWords.includes(word)) return;

  if (word === spanagram) {
    setFoundWords([...foundWords, word]);
    setHighlightedPaths([...highlightedPaths, { path: [...selectedIndices], type: 'spanagram' }]);
  } else if (validWords.includes(word)) {
    setFoundWords([...foundWords, word]);
    setHighlightedPaths([...highlightedPaths, { path: [...selectedIndices], type: 'theme' }]);
  }  else if (isValidEnglishWord(word)) {
  setFoundWords([...foundWords, word]);
  } else {
    setMessage("Not a valid word");
  }

  setSelectedIndices([]);
  setIsSelecting(false);
};


  const getHighlightType = (index) => {
    for (const h of highlightedPaths) {
      if (h.path.includes(index)) return h.type;
    }
    return null;
  };

  const isSelected = (index) => selectedIndices.includes(index);

  return (
    <div
      style={{ display: 'flex', justifyContent: 'center', padding: '2rem', fontFamily: 'sans-serif' }}
      onMouseUp={endSelect}
    >
      <div style={{ marginRight: '2rem', textAlign: 'center' }}>
        <div style={{ backgroundColor: '#d8f1fb', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.9rem', color: '#444', fontWeight: 'bold' }}>TODAY'S THEME</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{theme}</div>
        </div>
        <p><strong>{foundWords.length}</strong> words found.</p>
        {message && (
            <p style={{ color: '#d33', marginTop: '1rem', fontWeight: 'bold' }}>{message}</p>
        )}

      </div>
      <div style={{ marginTop: '1rem', textAlign: 'left' }}>
  <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Found Words:</div>
  <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
    {foundWords.map((word, idx) => {
      const isSpanagram = word === spanagram.toLowerCase();
      const isTheme = validWords.includes(word);
      const color = isSpanagram ? '#fdd835' : isTheme ? '#64b5f6' : '#ccc';

      return (
        <li key={idx} style={{ marginBottom: '0.25rem', color }}>
          {word.toUpperCase()}
        </li>
      );
    })}
  </ul>
</div>


      <div style={{ position: 'relative' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 2.5rem)',
            gap: '0.4rem',
            position: 'relative',
            zIndex: 1
          }}
        >
          {grid.map((letter, i) => {
            const highlightType = getHighlightType(i);
            const bgColor = isSelected(i)
              ? '#90caf9'
              : highlightType === 'spanagram'
              ? '#fdd835'
              : highlightType === 'theme'
              ? '#64b5f6'
              : '#d8f1fb';

            return (
              <div
                key={i}
                ref={(el) => (tileRefs.current[i] = el)}
                onMouseDown={() => startSelect(i)}
                onMouseEnter={() => continueSelect(i)}
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  backgroundColor: bgColor,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: '50%',
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                {letter}
              </div>
            );
          })}
        </div>

        {/* SVG lines */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 0
          }}
        >
          {highlightedPaths.map(({ path, type }, idx) => {
            const points = path
              .map((i) => {
                const el = tileRefs.current[i];
                if (!el) return null;
                const rect = el.getBoundingClientRect();
                const parentRect = tileRefs.current[0]?.parentNode?.getBoundingClientRect() || { left: 0, top: 0 };
                const x = rect.left - parentRect.left + rect.width / 2;
                const y = rect.top - parentRect.top + rect.height / 2;
                return `${x},${y}`;
              })
              .filter(Boolean);
            return (
              <polyline
                key={idx}
                points={points.join(' ')}
                fill="none"
                stroke={type === 'spanagram' ? '#fdd835' : '#64b5f6'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
