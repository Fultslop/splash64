// C64 boot screen demo.
// Recreates the Commodore 64 startup sequence, then loads and runs "FULTSLOP".
//
// Phase sequence:
//   BOOT → WAIT_READY → TYPING_LOAD → LOAD_RESPONSE →
//   WAIT_READY2 → TYPING_RUN → TYPING_TICKER → WAIT_DONE → DONE

import { drawChar, drawLine } from './charset.js';

// The C64 active display is 320×200 (40×25 chars). When the buffer is larger,
// the active area is centred and the surrounding region shows the border colour.
const ACTIVE_W = 320;
const ACTIVE_H = 200;
const COLS     = 40;
const ROWS     = 25;

// Attribution timing — not user-facing content so kept as local constants.
const ATTR_SPEED = 25;   // chars/sec (matches text plotter speed)
const ATTR_HOLD  = 5.0;  // seconds fully visible before dissolving
const ATTR_GAP   = 1.0;  // seconds between messages

export function createC64Demo(buffer, { charset, config, onComplete, onTickerStart } = {}) {
  const { width, height } = buffer;
  const { palette, coolSeq, bootLines, loadResponse, settleColors } = config;

  // Centre the 320×200 active area in the buffer (border fills the rest).
  const ox = Math.floor((width  - ACTIVE_W) / 2);
  const oy = Math.floor((height - ACTIVE_H) / 2);
  const cols = COLS;
  const rows = ROWS;
  const { charW, charH } = charset;

  // Settled color per markdown style once the cooling sequence completes.
  const SETTLE = settleColors ?? [14, 7, 3]; // normal, bold, code

  // --- State ---
  const lines      = [];      // complete text rows on screen
  const cellGens   = [];      // cellGens[r][c]   = globalCharCount when that char was placed
  const cellStyles = [];      // cellStyles[r][c] = markdown style (0=normal, 1=bold, 2=code)
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
  // HIDDEN → APPEARING → VISIBLE → DISAPPEARING → GAP → APPEARING → … → GONE
  const attributions = config.attributions ?? [];
  let   attrIdx      = 0;    // next message to show
  let   attrLines    = [];   // current message: array of line strings
  let   attrTotal    = 0;    // total chars in current message
  let   attrPhase    = 'HIDDEN';
  let   attrVisible  = 0;    // chars revealed (0..attrTotal)
  let   attrVanished = 0;    // chars erased from left (0..attrTotal)
  let   attrAccum    = 0;
  let   attrHoldTimer = 0;
  let   attrGapTimer  = 0;

  // --- Helpers ---

  function pushLine(text = '') {
    lines.push(text);
    // -1 = no cooling (boot / system response text stays plain light blue)
    cellGens.push(new Array(text.length).fill(-1));
    cellStyles.push(new Array(text.length).fill(0));
    cursorRow = lines.length - 1;
    cursorCol = text.length;
  }

  function startTyping(text) {
    typingText = text;
    typedChars = 0;
    charAccum  = 0;
    lines[cursorRow]      = '';
    cellGens[cursorRow]   = [];
    cellStyles[cursorRow] = [];
    cursorCol = 0;
  }

  function advanceTyping(dt, speed) {
    charAccum += dt * speed;
    while (charAccum >= 1 && typedChars < typingText.length) {
      cellGens[cursorRow].push(-1); // LOAD / RUN input — no cooling
      cellStyles[cursorRow].push(0);
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
    for (const l of bootLines) pushLine(l);
    pushLine('');  // cursor row
    setPhase('WAIT_READY');
  }

  function doLoadResponse() {
    // Commit the typed LOAD line, then append system response.
    for (const l of loadResponse) pushLine(l);
    pushLine('');  // cursor row for RUN
    setPhase('WAIT_READY2');
  }

  function doRunResponse() {
    // The "program" starts — begin outputting ticker text and attribution.
    tickerText  = config.tickerText.toUpperCase();
    tickerIdx   = 0;
    pushLine('');
    loadNextAttribution();
    onTickerStart?.();
    setPhase('TYPING_TICKER');
  }

  function loadNextAttribution() {
    if (attrIdx >= attributions.length) { attrPhase = 'GONE'; return; }
    attrLines    = attributions[attrIdx++];
    attrTotal    = Math.max(...attrLines.map(l => l.length));  // parallel: max line length
    attrVisible  = 0;
    attrVanished = 0;
    attrAccum    = 0;
    attrHoldTimer = 0;
    attrPhase    = 'APPEARING';
  }

  function appendTickerChar() {
    if (tickerIdx >= tickerText.length) return true; // done

    const ch = tickerText[tickerIdx++];

    if (ch === '\n' || cursorCol >= cols) {
      // Scroll up when the screen is full, then add a new blank line at the bottom.
      if (lines.length >= rows) {
        lines.shift();
        cellGens.shift();
        cellStyles.shift();
      }
      pushLine('');
    }

    if (ch !== '\n') {
      lines[cursorRow] += ch;
      cellGens[cursorRow].push(globalCharCount++);
      cellStyles[cursorRow].push(config.tickerStyles[tickerIdx - 1] ?? 0);
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
        attrVisible = Math.min(attrVisible + n, attrTotal);
        if (attrVisible >= attrTotal) { attrPhase = 'VISIBLE'; attrHoldTimer = 0; }
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
        attrVanished = Math.min(attrVanished + n, attrTotal);
        if (attrVanished >= attrTotal) { attrPhase = 'GAP'; attrGapTimer = 0; }
        break;
      }
      case 'GAP': {
        attrGapTimer += dt;
        if (attrGapTimer >= ATTR_GAP) loadNextAttribution();
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
    buffer.fillRect(0, 0, width, height, palette.border);
    // Active display area.
    buffer.fillRect(ox, oy, ACTIVE_W, ACTIVE_H, palette.background);

    // Text — each character colored by how many chars have been plotted since it appeared.
    for (let r = 0; r < lines.length && r < rows; r++) {
      const line = lines[r];
      for (let c = 0; c < line.length; c++) {
        const gen   = cellGens[r]?.[c] ?? -1;
        const age   = globalCharCount - gen;
        const color = gen < 0            ? palette.text
          : age < coolSeq.length        ? coolSeq[age]
          : SETTLE[cellStyles[r]?.[c] ?? 0];
        drawChar(buffer, c, r, line[c], color, charset, ox, oy);
      }
    }

    // Cursor block.
    if (cursorOn && phase !== 'DONE') {
      buffer.fillRect(
        ox + cursorCol * charW,
        oy + cursorRow * charH,
        charW, charH,
        palette.text,
      );
    }

    // Attribution messages — N right-aligned lines in the bottom border.
    // Appears char-by-char, holds, dissolves, gaps, then shows next message.
    if (attrPhase !== 'HIDDEN' && attrPhase !== 'GONE' && attrLines.length > 0) {
      const borderTopY = oy + ACTIVE_H;
      const borderH    = height - borderTopY;
      const baseY      = borderTopY + Math.floor((borderH - attrLines.length * charH) / 2);

      for (let i = 0; i < attrLines.length; i++) {
        const line   = attrLines[i];
        const lStart = Math.min(attrVanished, line.length);
        const lEnd   = Math.min(attrVisible,  line.length);
        if (lEnd > lStart) {
          drawLine(buffer, 0, 0, line.slice(lStart, lEnd), palette.background, charset,
            width - line.length * charW + lStart * charW, baseY + i * charH);
        }
      }
    }
  }

  return { update };
}
