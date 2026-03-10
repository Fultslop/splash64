// credits.js — load and rasterize scrolling credit lines from a markdown source.

import { rasterizeText } from './font.js';

// Parse README-style markdown into clean display lines for the credits scroll.
// Returns an array of strings; empty strings are blank spacer lines.
export function parseCreditsLines(raw) {
  const lines = [];
  let inCode = false;
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (t.startsWith('```')) { inCode = !inCode; continue; }
    if (inCode) continue;
    if (t === '---') { lines.push(''); continue; }
    const hm = t.match(/^#{1,3}\s+(.+)$/);
    if (hm) { lines.push(hm[1].toUpperCase()); lines.push(''); continue; }
    const c = t
      .replace(/\*\*\[([^\]]+)\]\([^)]+\)\*\*/g, (_, s) => s.toUpperCase())
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^-\s+/, '');
    lines.push(c);
  }
  return lines;
}

// Fetch and parse a markdown file; returns raw string[] (no rasterization yet).
export async function loadRawCreditLines(url) {
  const raw = await fetch(url).then(r => r.text());
  return parseCreditsLines(raw);
}

// Word-wrap a single line to maxChars, breaking at spaces where possible.
export function wrapLine(text, maxChars) {
  if (text.length <= maxChars) return [text];
  const result = [];
  let remaining = text;
  while (remaining.length > maxChars) {
    let breakAt = remaining.lastIndexOf(' ', maxChars);
    if (breakAt <= 0) breakAt = maxChars;
    result.push(remaining.slice(0, breakAt).trimEnd());
    remaining = remaining.slice(breakAt).trimStart();
  }
  if (remaining.length > 0) result.push(remaining);
  return result;
}

// Wrap each line to maxCharsPerLine and rasterize to sprites (null = spacer).
export function buildCreditLines(rawLines, maxCharsPerLine) {
  const wrapped = [];
  for (const line of rawLines) {
    if (line.length === 0) { wrapped.push(''); continue; }
    for (const w of wrapLine(line, maxCharsPerLine)) wrapped.push(w);
  }
  return wrapped.map(l => l.length > 0 ? rasterizeText(l, 'C64 Pro Mono', 8, 1, 1) : null);
}
