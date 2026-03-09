DevLog
======

Format:

<date DD/MM/YYYY> <author> [<FEAT/REFACTOR/CHORE/FIX/DOC>]: 1 line description. max 5 lines of explanation (goal, not a hard limit). 

---

**09/03/2026 Claude [FIX]**: replace `location.reload()` with soft demo restart to avoid browser security abort on GitHub Pages.
- `fade.js`: added `onComplete` param to `wrapWithAutoFade`; when fade completes, calls `onComplete()` instead of `location.reload()`. Added `done` flag to prevent double-firing.
- `main.js`: added `restart()` closure inside `init()` — picks the next demo via `chooseDemoName()`, resizes the renderer, and launches it via `setUpdate` without a page reload.
- `startSunset` gains an `onComplete` param forwarded to `wrapWithAutoFade`.
- `location.reload()` remains as a fallback only if no `onComplete` is provided (backwards compat).

**08/03/2026 FS [DOC]**: intitial dev log setup.

**08/03/2026 Claude [FEAT]**: bootstrap canvas infrastructure + sunset sky gradient.
- `index.html`: minimal shell with a single canvas element.
- `src/common/renderer.js`: 640x480 render target, pixel-perfect scaling (letterbox, no interpolation), rAF game loop.
- `src/common/palette.js`: 32-color palette structure, starting with sunset palette.
- `src/demo/sunset/sunset.js`: first demo stub — renders sky gradient using the palette.
- Goal: get something visible in the browser and validate the pipeline skeleton.

**08/03/2026 Claude [REFACTOR]**: strict palette enforcement + pixel buffer rendering.
- `PixelBuffer` now takes a palette array at construction; all draw calls use palette index (0–31).
- Eliminated all raw hex from draw calls — color outside the palette is impossible.
- Renderer passes the palette to PixelBuffer; demos import only index constants.
- Side effect: enables palette swapping / animation at zero extra cost.

**08/03/2026 Claude [FEAT]**: Mt. Fuji silhouette + parallax system.
- `src/common/parallax.js`: N-layer scroll system, speeds in px/sec, wraps at wrapWidth, `drawTiled()` helper for seamless tiling.
- `PixelBuffer.fillPolygon()`: scanline rasterization, accepts offsetX for parallax.
- `sunset.js`: Fuji body + snow cap drawn as polygons on layer 0 (8px/sec); layers 1+2 stubbed for temple and trees.

**08/03/2026 Claude [FEAT]**: temple + tree silhouette layers.
- Temple: 5-part pagoda polygon (body + 3 roof tiers + spire), scrolling on layer 1 (16px/sec).
- Trees: single 320-wide jagged-top polygon strip, tiled on layer 2 (30px/sec).
- All three layers now visible and scrolling at distinct parallax speeds.

**08/03/2026 Claude [FEAT]**: title text rendering via web font.
- `index.html`: loads Shojumaru from Google Fonts.
- `src/common/font.js`: `rasterizeText()` renders text to a temp canvas, thresholds alpha > 127 into a pixel sprite `{ pixels, w, h }`.
- `PixelBuffer.blitSprite()`: draws a sprite at (x, y) in a palette color.
- `main.js`: awaits `document.fonts.ready` before rasterizing — ensures font is loaded.
- `sunset.js`: title sprite drawn centered at top, in palette color SNOW (17).

**08/03/2026 Claude [FEAT]**: scrolling ticker text.
- `src/common/ticker.js`: `loadTickerText(url, startLine, endLine)` fetches + slices a text file; `createTicker(sprite, speed)` manages scrollX state.
- `PixelBuffer.blitSpriteScrolled()`: draws a sprite window with seamless horizontal wrap.
- `sunset.js`: dark background bar at bottom, ticker scrolls over it in SNOW color.
- Configured in `main.js`: devlog from line 10, Shojumaru 8px, 40 px/sec.

**08/03/2026 Claude [FEAT]**: three palette variants, random no-repeat selection on startup.
- `palette.js`: added `CRIMSON` (fire/desert — deep crimsons → amber gold, white-hot sun) and `OCEAN` (coastal twilight — deep navy → teal → aqua, pale gold sun). Exported `PALETTES` array.
- All palettes share the same 32-slot semantic layout so all demo draw calls work unchanged.
- `main.js`: random pick from `PALETTES` excluding the previous index, stored in `localStorage('paletteIdx')` — never repeats on consecutive refresh.

**08/03/2026 Claude [FEAT]**: randomised title and ticker positions per session.
- Title Y: random in `[floor(H*0.08), H - titleSprite.h]` — anywhere on screen.
- Ticker Y: random from whichever zone(s) are available above or below the title, with a minimum 30 px gap.

**08/03/2026 Claude [REFACTOR]**: session config object centralises all randomisation.
- New `src/demo/sunset/config.js`: `generateSunsetConfig(titleSprite)` produces `{ palette, paletteIdx, titleX, titleY, tickerY, tickerH }`.
- Sprites rasterized before config generation (sprites are palette-agnostic), so palette is known before `initRenderer`.
- `sunset.js` stripped of all `Math.random()` calls — reads layout directly from `config`.
- `main.js` import list simplified; palette no longer imported directly.

**08/03/2026 Claude [FEAT]**: C64 boot sequence demo.
- New demo: `src/demo/c64/` — recreates the Commodore 64 startup screen.
- Boot text appears instantly; then types `LOAD "FULTSLOP",8,1`, shows `SEARCHING / LOADING / READY.`, types `RUN`, plots devlog ticker text char-by-char, waits, then transitions to sunset.
- `charset.js`: per-glyph rasterization with `fillText(ch, 0, 0)` — no x-offset, exact grid alignment. `charW` measured via `measureText` on the loaded font.
- `C64_PALETTE`: 16 authentic Colodore colors padded to 32 slots. Blue (6) = background, Light Blue (14) = border + text.
- `main.js`: demo selection (sunset / c64) with localStorage no-repeat, separate from palette selection.
- `renderer.js`: `startLoop` now returns `{ setUpdate }` for live update-fn swap; `initRenderer` exposes `setPalette`.
- `PixelBuffer.setPalette()`: swaps the active palette at runtime, enabling seamless c64→sunset transition without page reload.
- `@font-face` for C64 Pro Mono declared in `index.html`; force-loaded in `main.js` via `document.fonts.load()` before `buildCharset` (local @font-face fonts aren't fetched by `document.fonts.ready` unless used in CSS).

**08/03/2026 Claude [FEAT]**: C64 demo — authentic 384×272 buffer with real border area + terminal scroll.
- `renderer.js`: `initRenderer` now accepts optional `w, h` params (default 320×200); returns `resize(w, h)` for mid-session buffer changes. `buffer` exposed as a getter so callers always see the current buffer after resize.
- `main.js`: demo dimensions chosen before `initRenderer`; C64 gets 384×272, sunset 320×200. On c64→sunset transition, `renderer.resize(320, 200)` shrinks the buffer before handing off.
- `c64.js`: removed hardcoded `BORDER` constant; `ACTIVE_W/H = 320×200`, `COLS=40`, `ROWS=25`. Active area centred in the buffer — border colour fills the surrounding region. Full 40-column text grid with authentic spacing.
- `c64.js`: terminal scroll — when the screen is full during ticker output, `lines.shift()` scrolls all text up one row instead of stopping.
- `config.js`: replaced `loadTickerText` (which collapsed all lines) with `loadPrinterText` — preserves source newlines, collapses runs of 2+ blanks to 1. Newlines in the text now cause real line breaks in the terminal output.

**08/03/2026 Claude [FEAT]**: C64 demo — animated font attribution in bottom border.
- `c64.js`: two right-aligned lines (`C64 FONT:` / `HTTPS://STYLE64.ORG/C64-TRUETYPE`) in the bottom border strip, drawn in P.BG against the P.BORD background.
- Own state machine: `HIDDEN → APPEARING → VISIBLE → DISAPPEARING → GONE`. Triggered at start of `TYPING_TICKER` phase.
- Appears char-by-char at 25 chars/sec (matches text plotter), holds 5 s, then dissolves left-to-right at the same speed.
- Slice math preserves right-alignment at all stages: each char is positioned relative to the full right-aligned string width, independent of how many chars are currently visible.

**08/03/2026 Claude [FEAT]**: C64 demo — per-character color cooling effect on ticker text.
- Each character plotted by the ticker starts white (C64 palette 1) and transitions through cyan → green → light blue → blue → light blue (settled) as subsequent characters are plotted — one step per new char, not per frame.
- `globalCharCount` increments each time a character is placed; `cellGens[r][c]` stores the count at placement time; `age = globalCharCount - gen` drives the `COOL_SEQ` lookup.
- Boot text, LOAD, and RUN lines are assigned gen `-1` (sentinel) so they render as plain light blue with no cycling.

**08/03/2026 Claude [FEAT]**: C64 demo — multi-message attribution driven by JSON.
- `src/demo/c64/attribution.json`: array of messages, each an array of 1–N line strings.
- `config.js` fetches the JSON in parallel with the devlog ticker text.
- Attribution state machine gains a `GAP` phase (1 s pause) between messages; `loadNextAttribution()` advances the index and sets `GONE` when exhausted.
- Draw block generalised to N lines with dynamic vertical centering in the border strip.

**08/03/2026 Claude [FEAT]**: FPS counter — DOM overlay, key-toggled, zero cost when hidden.
- `main.js`: `createFpsCounter()` appends a fixed-position `<div>` (green monospace, top-left).
- Press `f` to toggle visibility; counters reset on toggle-on so the first reading is always fresh.
- Sampling only runs when visible: accumulates frame count + elapsed time, updates `textContent` every 500 ms (2 Hz). No cost at all when hidden — `sample(dt)` is an immediate return.
- `sampleFps` passed through `startSunset` and `onComplete` so it survives the c64→sunset transition.

**08/03/2026 Claude [FEAT]**: C64 demo — parallel attribution reveal + music button reveal on ticker start.
- Attribution lines now reveal simultaneously: `attrTotal = Math.max(...lines.map(l => l.length))` so all lines animate at the same rate, each clamped independently to its own length.
- Music button hidden at startup; `createMusicPlayer` returns `{ scheduleReveal(delaySecs) }` — shows the button after a delay (no autoplay; user must click to play).
- `onTickerStart` callback passed into `createC64Demo`; fired in `doRunResponse` when the ticker phase begins; `main.js` uses it to call `scheduleReveal(config.musicDelay)`.
- `musicDelay` config entry (seconds, default 0) controls when the button becomes visible after the ticker starts.

**08/03/2026 Claude [FIX]**: font rasterizer rewrite — per-character rendering with explicit letter spacing.
- Previous approach (whole string → one canvas) caused: canvas overflow for long strings (silent pixel corruption), no control over letter spacing, antialiasing threshold holes.
- New approach in `font.js`: each character rasterized to its own canvas, placed manually with `letterSpacing` gap.
- Signature: `rasterizeText(text, fontFamily, fontSize, scaleX=1, letterSpacing=1)`.
- Alpha threshold lowered to 32 (was 127) — captures antialiased edge pixels.
- Ticker now uses Press Start 2P at 10px, scaleX=1, letterSpacing=1.

**09/03/2026 Claude [REFACTOR]**: sunset now uses C64 Pro Mono for all text.
- Dropped Shojumaru (title) and Press Start 2P (ticker) — both Google Fonts removed from index.html.
- Title: C64 Pro Mono 16px (clean 2× of native 8px grid), letterSpacing=2. Ticker: 8px native, letterSpacing=1.
- All text across both demos now uses a single font; no external font network requests.

**09/03/2026 Claude [FIX]**: sunset fonts not reliably loaded before rasterization.
- `document.fonts.ready` does not guarantee `font-display:swap` Google Fonts are available — it only resolves queued loads.
- `startSunset` now calls `await Promise.all([document.fonts.load('36px Shojumaru'), document.fonts.load('10px "Press Start 2P"')])` before any `rasterizeText` call. Same pattern already used for C64 Pro Mono.

**09/03/2026 Claude [FEAT]**: shared loading screen for both demos.
- New `src/common/loading.js`: `createLoadingScreen()` → `{ setProgress(0..1), hide() }`. CSS-only overlay (system monospace, no asset dependencies) so it works before any fonts or canvas are ready.
- `init()` in `main.js` creates the loading screen immediately, then reports progress through each async step: `fonts.ready` (10%), per-demo font loads (50%), text/config fetches (90–100%), then `hide()`.
- `startSunset` accepts an optional `onProgress` callback (used for direct startup; omitted on c64→sunset transition where the c64 animation is already running).
- Architecture: `load page → loading screen → fonts.ready → force-load fonts → fetch text/config → hide loading → demo starts`.