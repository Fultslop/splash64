// C64 demo — session config.
// generateC64Config() is async because it fetches the ticker text.

// Parse inline markdown spans from a newline-delimited string.
// Strips ** (bold) and ` (code) markers; returns { text, styles }.
// styles is a Uint8Array parallel to text: 0=normal, 1=bold, 2=code.
// Malformed spans (no closing marker) auto-close at end of each line.
function parseMarkdown(raw) {
  const chars = [], styles = [];
  for (const line of raw.split('\n')) {
    let style = 0;  // reset at every line — closes any unclosed span
    let i = 0;
    while (i < line.length) {
      if (style !== 2 && line[i] === '*' && line[i + 1] === '*') {
        style = style === 1 ? 0 : 1;  // toggle bold
        i += 2;
      } else if (style !== 1 && line[i] === '`') {
        style = style === 2 ? 0 : 2;  // toggle code
        i += 1;
      } else {
        chars.push(line[i]);
        styles.push(style);
        i++;
      }
    }
    chars.push('\n');
    styles.push(0);
  }
  // trim trailing newline added by the loop
  if (chars[chars.length - 1] === '\n') { chars.pop(); styles.pop(); }
  return { text: chars.join(''), styles: new Uint8Array(styles) };
}

// Load text preserving line breaks so the C64 printer respects newlines.
// Skips the first `startLine` lines, strips trailing whitespace per line,
// and collapses runs of more than one blank line into a single blank.
async function loadPrinterText(url, startLine = 0) {
  const raw   = await fetch(url).then(r => r.text());
  const lines = raw.split('\n').slice(startLine).map(l => l.trimEnd());
  const out   = [];
  let   blanks = 0;
  for (const l of lines) {
    if (l.length === 0) { blanks++; } else { blanks = 0; }
    if (blanks <= 1) out.push(l);
  }
  return out.join('\n').trim();
}

export async function generateC64Config() {
  const [rawText, attributions] = await Promise.all([
    loadPrinterText('./doc/agent/devlog.md', 10),
    fetch('./src/demo/c64/attribution.json').then(r => r.json()),
  ]);

  const { text: tickerText, styles: tickerStyles } = parseMarkdown(rawText);

  return {
    // --- Screen text ---
    bootLines: [
      '    **** COMMODORE 64 BASIC V2 ****',
      '',
      ' 64K RAM SYSTEM  38911 BASIC BYTES FREE',
      '',
      '',
      'READY.',
    ],
    loadResponse: [
      '',
      'SEARCHING FOR FULTSLOP',
      'LOADING',
      '',
      'READY.',
    ],
    loadCmd:       'LOAD "// SPLASH 64 //",8,1',
    tickerText,
    tickerStyles,
    attributions,

    // --- Colors (C64 palette indices) ---
    palette: {
      background: 6,   // Blue
      border:     14,  // Light Blue
      text:       14,  // Light Blue
    },
    // Cooling animation: sequence of palette indices from "hot" to settled.
    // age 0 = just placed, age >= coolSeq.length → use settleColors.
    coolSeq:      [1, 7, 1, 7, 3, 7, 3, 5, 14],
    // Settled color per markdown style: normal, bold, code.
    settleColors: [14, 7, 3],  // light blue, yellow, cyan

    // --- Timing ---
    typeSpeed:      10,   // chars/sec — user typing (LOAD, RUN)
    outputSpeed:    25,   // chars/sec — program output (ticker text)
    waitReady:      0.8,  // seconds to blink cursor at each READY prompt
    waitDone:       5.0,  // seconds to hold screen after ticker finishes
    musicDelay:     0.0,  // seconds after ticker starts before music plays

    // --- Auto-transition ---
    maxDisplayTime:  45,  // seconds before fade-to-black and page reload
    fadeDuration:   1.0,  // seconds for the fade-out
    fadeInDuration: 2.0,  // seconds for the fade-in at demo start
  };
}
