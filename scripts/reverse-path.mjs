import { readFileSync, writeFileSync } from 'fs';

const svg = readFileSync('static/images/path_Peebee.svg', 'utf8');

const pathMatch = svg.match(/(<path[^>]*\sd=")([^"]+)(")/);
if (!pathMatch) { console.error('No path found'); process.exit(1); }

const d = pathMatch[2];

// Tokenize: split into command letters and numbers
const tokens = d.match(/[MmCcLlSsQqTtAaZz]|[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g) || [];

// Parse into absolute cubic bezier segments, expanding implicit repetitions
const curves = []; // {start, c1, c2, end}
let cx = 0, cy = 0;
let startX = 0, startY = 0;
let i = 0;

while (i < tokens.length) {
  const cmd = tokens[i++];
  if (cmd === 'M') {
    cx = parseFloat(tokens[i++]); cy = parseFloat(tokens[i++]);
    startX = cx; startY = cy;
    // Implicit L after M
    while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) {
      cx = parseFloat(tokens[i++]); cy = parseFloat(tokens[i++]);
    }
  } else if (cmd === 'm') {
    cx += parseFloat(tokens[i++]); cy += parseFloat(tokens[i++]);
    startX = cx; startY = cy;
  } else if (cmd === 'C') {
    while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) {
      const sx = cx, sy = cy;
      const c1x = parseFloat(tokens[i++]), c1y = parseFloat(tokens[i++]);
      const c2x = parseFloat(tokens[i++]), c2y = parseFloat(tokens[i++]);
      const ex  = parseFloat(tokens[i++]), ey  = parseFloat(tokens[i++]);
      curves.push({ start:[sx,sy], c1:[c1x,c1y], c2:[c2x,c2y], end:[ex,ey] });
      cx = ex; cy = ey;
    }
  } else if (cmd === 'c') {
    while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) {
      const sx = cx, sy = cy;
      const dc1x = parseFloat(tokens[i++]), dc1y = parseFloat(tokens[i++]);
      const dc2x = parseFloat(tokens[i++]), dc2y = parseFloat(tokens[i++]);
      const dex  = parseFloat(tokens[i++]), dey  = parseFloat(tokens[i++]);
      curves.push({ start:[sx,sy], c1:[cx+dc1x,cy+dc1y], c2:[cx+dc2x,cy+dc2y], end:[cx+dex,cy+dey] });
      cx += dex; cy += dey;
    }
  } else {
    // Skip other commands
    while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) i++;
  }
}

console.log('Curves parsed:', curves.length);
console.log('Original start:', curves[0]?.start);
console.log('Original end:', curves[curves.length-1]?.end);

// Reverse: new path starts at last end, each curve reversed
const out = [];
const lastEnd = curves[curves.length - 1].end;
out.push(`M${lastEnd[0].toFixed(2)},${lastEnd[1].toFixed(2)}`);

for (let j = curves.length - 1; j >= 0; j--) {
  const { start, c1, c2 } = curves[j];
  // Reversed cubic: swap c1/c2, new endpoint = old start
  out.push(`C${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${start[0].toFixed(2)},${start[1].toFixed(2)}`);
}

const newD = out.join('');
const newSvg = svg.replace(pathMatch[0], pathMatch[1] + newD + pathMatch[3]);
writeFileSync('static/images/path_Peebee.svg', newSvg);
console.log('Done. New start Y:', lastEnd[1].toFixed(2), '→ should be near 0');
