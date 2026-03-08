// C64 boot screen demo.
// Recreates the Commodore 64 startup sequence, then loads and runs "FULTSLOP".
//
// Phase sequence:
//   BOOT → WAIT_READY → TYPING_LOAD → LOAD_RESPONSE →
//   WAIT_READY2 → TYPING_RUN → TYPING_TICKER → WAIT_DONE → DONE

import { drawLine, drawChar } from './charset.js';

// Palette indices into C64_PALETTE.
const P = {
  BG:    6,   // Blue — screen background
  BORD:  14,  // Light Blue — border strip
  TEXT:  14,  // Light Blue — all text
};

// The C64 active display is 320×200 (40×25 chars). When the buffer is larger,
// the active area is centred and the surrounding region shows the border colour.
const ACTIVE_W = 320;
const ACTIVE_H = 200;
const COLS     = 40;
const ROWS     = 25;

// Boot screen text (authentic Commodore 64, then our READY prompt).
const BOOT_LINES = [
  '    **** COMMODORE 64 BASIC V2 ****',
  '',
  ' 64K RAM SYSTEM  38911 BASIC BYTES FREE',
  '',
  '',
  'READY.',
];

// What appears after LOAD ... ENTER.
const LOAD_RESPONSE = [
  '',
  'SEARCHING FOR FULTSLOP',
  'LOADING',
  '',
  'READY.',
];

export function createC64Demo(buffer, { charset, config, onComplete } = {}) {
  const { width, height } = buffer;

  // Centre the 320×200 active area in the buffer (border fills the rest).
  const ox = Math.floor((width  - ACTIVE_W) / 2);
  const oy = Math.floor((height - ACTIVE_H) / 2);
  const cols = COLS;
  const rows = ROWS;
  const { charW, charH } = charset;

  // --- State ---
  const lines = [];           // complete text rows on screen
  let   cursorRow = 0;        // row the cursor sits on
  let   cursorCol = 0;        // col (= chars typed on that row so far)

  let   phase       = 'BOOT';
  let   phaseTimer  = 0;

  // Typing state.
  let   typingText  = '';
  let   typedChars  = 0;
  let   charAccum   = 0;

  // Ticker state.
  let   tickerText  = '';
  let   tickerIdx   = 0;

  // Cursor blink.
  let   cursorOn    = true;
  let   blinkAccum  = 0;
  const BLINK_HALF  = 0.3;   // seconds per half-period

  // --- Helpers ---

  function pushLine(text = '') {
    lines.push(text);
    cursorRow = lines.length - 1;
    cursorCol = text.length;
  }

  function startTyping(text) {
    typingText = text;
    typedChars = 0;
    charAccum  = 0;
    lines[cursorRow] = '';
    cursorCol = 0;
  }

  function advanceTyping(dt, speed) {
    charAccum += dt * speed;
    while (charAccum >= 1 && typedChars < typingText.length) {
      typedChars++;
      charAccum--;
    }
    lines[cursorRow] = typingText.slice(0, typedChars);
    cursorCol = typedChars;
    return typedChars >= typingText.length;
  }

  function setPhase(p) {
    phase      = p;
    phaseTimer = 0;
  }

  // --- Phase transitions ---

  function doBootPhase() {
    for (const l of BOOT_LINES) pushLine(l);
    pushLine('');  // cursor row
    setPhase('WAIT_READY');
  }

  function doLoadResponse() {
    // Commit the typed LOAD line, then append system response.
    for (const l of LOAD_RESPONSE) pushLine(l);
    pushLine('');  // cursor row for RUN
    setPhase('WAIT_READY2');
  }

  function doRunResponse() {
    // The "program" starts — begin outputting ticker text.
    tickerText = config.tickerText.toUpperCase();
    tickerIdx  = 0;
    pushLine('');
    setPhase('TYPING_TICKER');
  }

  function appendTickerChar() {
    if (tickerIdx >= tickerText.length) return true; // done

    const ch = tickerText[tickerIdx++];

    if (ch === '\n' || cursorCol >= cols) {
      // Scroll up when the screen is full, then add a new blank line at the bottom.
      if (lines.length >= rows) lines.shift();
      pushLine('');
    }

    if (ch !== '\n') {
      lines[cursorRow] += ch;
      cursorCol++;
    }
    return false;
  }

  // --- Update ---

  function update(dt) {
    // Cursor blink (runs every phase except DONE).
    if (phase !== 'DONE') {
      blinkAccum += dt;
      if (blinkAccum >= BLINK_HALF) {
        blinkAccum -= BLINK_HALF;
        cursorOn = !cursorOn;
      }
    }

    phaseTimer += dt;

    switch (phase) {

      case 'BOOT':
        doBootPhase();
        break;

      case 'WAIT_READY':
        if (phaseTimer >= config.waitReady) {
          startTyping(config.loadCmd);
          setPhase('TYPING_LOAD');
        }
        break;

      case 'TYPING_LOAD': {
        const done = advanceTyping(dt, config.typeSpeed);
        if (done && phaseTimer >= config.loadCmd.length / config.typeSpeed + 0.35) {
          doLoadResponse();
        }
        break;
      }

      case 'WAIT_READY2':
        if (phaseTimer >= config.waitReady) {
          startTyping('RUN');
          setPhase('TYPING_RUN');
        }
        break;

      case 'TYPING_RUN': {
        const done = advanceTyping(dt, config.typeSpeed);
        if (done && phaseTimer >= 3 / config.typeSpeed + 0.35) {
          doRunResponse();
        }
        break;
      }

      case 'TYPING_TICKER': {
        charAccum += dt * config.outputSpeed;
        while (charAccum >= 1) {
          charAccum--;
          if (appendTickerChar()) {
            setPhase('WAIT_DONE');
            break;
          }
        }
        break;
      }

      case 'WAIT_DONE':
        if (phaseTimer >= config.waitDone) {
          setPhase('DONE');
          onComplete?.();
        }
        break;

      case 'DONE':
        break;
    }

    // --- Render ---
    draw();
  }

  function draw() {
    // Border area (fills everything outside the 320×200 active region).
    buffer.fillRect(0, 0, width, height, P.BORD);
    // Active display area.
    buffer.fillRect(ox, oy, ACTIVE_W, ACTIVE_H, P.BG);

    // Text.
    for (let r = 0; r < lines.length && r < rows; r++) {
      drawLine(buffer, 0, r, lines[r], P.TEXT, charset, ox, oy);
    }

    // Cursor block.
    if (cursorOn && phase !== 'DONE') {
      buffer.fillRect(
        ox + cursorCol * charW,
        oy + cursorRow * charH,
        charW, charH,
        P.TEXT,
      );
    }
  }

  return { update };
}
