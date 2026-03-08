// C64 demo — session config.
// generateC64Config() is async because it fetches the ticker text.

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
  const tickerText = await loadPrinterText('./doc/agent/devlog.md', 10);

  return {
    loadCmd:       'LOAD "FULTSLOP",8,1',
    tickerText,
    typeSpeed:     10,   // chars/sec — user typing (LOAD, RUN)
    outputSpeed:   25,   // chars/sec — program output (ticker text)
    waitReady:     0.8,  // seconds to blink cursor at each READY prompt
    waitDone:      5.0,  // seconds to hold screen after ticker finishes (shows font attribution)
  };
}
