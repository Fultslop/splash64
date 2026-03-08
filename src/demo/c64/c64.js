// C64 boot screen demo.
// Recreates the Commodore 64 startup sequence, then loads and runs "FULTSLOP".
//
// Phase sequence:
//   BOOT → WAIT_READY → TYPING_LOAD → LOAD_RESPONSE →
//   WAIT_READY2 → TYPING_RUN → TYPING_TICKER → WAIT_DONE → DONE

import { drawChar, drawLine } from './charset.js';

// Palette indices into C64_PALETTE.
const P = {
  BG:    6,   // Blue — screen background
  BORD:  14,  // Light Blue — border strip
  TEXT:  14,  // Light Blue — all text
};

// Color-cooling sequence applied to each character as new chars are plotted.
// age 0 = just placed (white), cools down to settled light blue.
const COOL_SEQ = [1, 7, 1, 7, 3, 7, 3, 5, 14];
//                W  Cy  G  LB  B  LB  LB  (C64 palette indices)

// The C64 active display is 320×200 (40×25 chars). When the buffer is larger,
// the active area is centred and the surrounding region shows the border colour.
const ACTIVE_W = 320;
const ACTIVE_H = 200;
const COLS     = 40;
const ROWS     = 25;

// Font attribution shown in the bottom border while the program text prints.
// Two right-aligned lines; appears char-by-char, holds, then dissolves from the left.
const ATTR_L1    = 'C64 FONT:';
const ATTR_L2    = 'HTTPS://STYLE64.ORG/C64-TRUETYPE';
const ATTR_TOTAL = ATTR_L1.length + ATTR_L2.length;
const ATTR_SPEED = 25;   // chars/sec (matches text plotter speed)
const ATTR_HOLD  = 5.0;  // seconds fully visible before dissolving

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
  const lines    = [];        // complete text rows on screen
  const cellGens = [];        // cellGens[r][c] = globalCharCount when that char was placed
  let   globalCharCount = 0;  // increments each time a character is plotted
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

  // Attribution animation state.
  // HIDDEN → APPEARING → VISIBLE → DISAPPEARING → GONE
  let   attrPhase     = 'HIDDEN';
  let   attrVisible   = 0;   // chars revealed (0..ATTR_TOTAL)
  let   attrVanished  = 0;   // chars erased from left (0..ATTR_TOTAL)
  let   attrAccum     = 0;
  let   attrHoldTimer = 0;

  // --- Helpers ---

  function pushLine(text = '') {
    lines.push(text);
    // -1 = no cooling (boot / system response text stays plain light blue)
    cellGens.push(new Array(text.length).fill(-1));
    cursorRow = lines.length - 1;
    cursorCol = text.length;
  }

  function startTyping(text) {
    typingText = text;
    typedChars = 0;
    charAccum  = 0;
    lines[cursorRow]    = '';
    cellGens[cursorRow] = [];
    cursorCol = 0;
  }

  function advanceTyping(dt, speed) {
    charAccum += dt * speed;
    while (charAccum >= 1 && typedChars < typingText.length) {
      cellGens[cursorRow].push(-1); // LOAD / RUN input — no cooling
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
    // The "program" starts — begin outputting ticker text and attribution.
    tickerText  = config.tickerText.toUpperCase();
    tickerIdx   = 0;
    attrPhase   = 'APPEARING';
    attrAccum   = 0;
    pushLine('');
    setPhase('TYPING_TICKER');
  }

  function appendTickerChar() {
    if (tickerIdx >= tickerText.length) return true; // done

    const ch = tickerText[tickerIdx++];

    if (ch === '\n' || cursorCol >= cols) {
      // Scroll up when the screen is full, then add a new blank line at the bottom.
      if (lines.length >= rows) {
        lines.shift();
        cellGens.shift();
      }
      pushLine('');
    }

    if (ch !== '\n') {
      lines[cursorRow] += ch;
      cellGens[cursorRow].push(globalCharCount++);
      cursorCol++;
    }
    return false;
  }

  function updateAttribution(dt) {
    switch (attrPhase) {
      case 'APPEARING': {
        attrAccum += dt * ATTR_SPEED;
        const n = Math.floor(attrAccum);
        attrAccum -= n;
        attrVisible = Math.min(attrVisible + n, ATTR_TOTAL);
        if (attrVisible >= ATTR_TOTAL) { attrPhase = 'VISIBLE'; attrHoldTimer = 0; }
        break;
      }
      case 'VISIBLE': {
        attrHoldTimer += dt;
        if (attrHoldTimer >= ATTR_HOLD) { attrPhase = 'DISAPPEARING'; attrAccum = 0; }
        break;
      }
      case 'DISAPPEARING': {
        attrAccum += dt * ATTR_SPEED;
        const n = Math.floor(attrAccum);
        attrAccum -= n;
        attrVanished = Math.min(attrVanished + n, ATTR_TOTAL);
        if (attrVanished >= ATTR_TOTAL) attrPhase = 'GONE';
        break;
      }
    }
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

    if (attrPhase !== 'HIDDEN' && attrPhase !== 'GONE') updateAttribution(dt);

    // --- Render ---
    draw();
  }

  function draw() {
    // Border area (fills everything outside the 320×200 active region).
    buffer.fillRect(0, 0, width, height, P.BORD);
    // Active display area.
    buffer.fillRect(ox, oy, ACTIVE_W, ACTIVE_H, P.BG);

    // Text — each character colored by how many chars have been plotted since it appeared.
    for (let r = 0; r < lines.length && r < rows; r++) {
      const line = lines[r];
      for (let c = 0; c < line.length; c++) {
        const gen   = cellGens[r]?.[c] ?? -1;
        const color = gen < 0 ? P.TEXT : COOL_SEQ[Math.min(globalCharCount - gen, COOL_SEQ.length - 1)];
        drawChar(buffer, c, r, line[c], color, charset, ox, oy);
      }
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

    // Font attribution — two right-aligned lines in the bottom border.
    // Appears char-by-char, holds, then dissolves from the left.
    if (attrPhase !== 'HIDDEN' && attrPhase !== 'GONE') {
      const borderTopY = oy + ACTIVE_H;
      const borderH    = height - borderTopY;
      const baseY      = borderTopY + Math.floor((borderH - 2 * charH) / 2);

      // Line 1 — visible slice [attrVanished .. min(attrVisible, L1.length))
      const l1Start = Math.min(attrVanished, ATTR_L1.length);
      const l1End   = Math.min(attrVisible,  ATTR_L1.length);
      if (l1End > l1Start) {
        drawLine(buffer, 0, 0, ATTR_L1.slice(l1Start, l1End), P.BG, charset,
          width - ATTR_L1.length * charW + l1Start * charW, baseY);
      }

      // Line 2 — visible slice with indices offset by L1.length
      const l2Start = Math.max(attrVanished - ATTR_L1.length, 0);
      const l2End   = Math.max(attrVisible  - ATTR_L1.length, 0);
      if (l2End > l2Start) {
        drawLine(buffer, 0, 0, ATTR_L2.slice(l2Start, l2End), P.BG, charset,
          width - ATTR_L2.length * charW + l2Start * charW, baseY + charH);
      }
    }
  }

  return { update };
}
