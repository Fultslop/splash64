// C64 demo — session config.
// generateC64Config() is async because it fetches the ticker text.

import { loadTickerText } from '../../common/ticker.js';

export async function generateC64Config() {
  const tickerText = await loadTickerText('./doc/agent/devlog.md', 10);

  return {
    loadCmd:       'LOAD "FULTSLOP",8,1',
    tickerText,
    typeSpeed:     10,   // chars/sec — user typing (LOAD, RUN)
    outputSpeed:   25,   // chars/sec — program output (ticker text)
    waitReady:     0.8,  // seconds to blink cursor at each READY prompt
    waitDone:      2.5,  // seconds to hold screen after ticker finishes
  };
}
