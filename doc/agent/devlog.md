DevLog
======

Format:

<date DD/MM/YYYY> <author> [<FEAT/REFACTOR/CHORE/FIX/DOC>]: 1 line description. max 5 lines of explanation (goal, not a hard limit). 

---

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

**08/03/2026 Claude [FIX]**: font rasterizer rewrite — per-character rendering with explicit letter spacing.
- Previous approach (whole string → one canvas) caused: canvas overflow for long strings (silent pixel corruption), no control over letter spacing, antialiasing threshold holes.
- New approach in `font.js`: each character rasterized to its own canvas, placed manually with `letterSpacing` gap.
- Signature: `rasterizeText(text, fontFamily, fontSize, scaleX=1, letterSpacing=1)`.
- Alpha threshold lowered to 32 (was 127) — captures antialiased edge pixels.
- Ticker now uses Press Start 2P at 10px, scaleX=1, letterSpacing=1.