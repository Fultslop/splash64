# Architecture
==============

## Overview

A retro-style HTML5 demo/splash screen engine. Pure ES6+ modules, HTML5 Canvas, zero npm packages. Three demos: `sunset`, `galaga`, `cube`. On page load one is picked at random (never repeating on refresh).

---

## Render Pipeline

```
load page → await fonts → rasterize sprites → generateConfig → initRenderer → load ticker → startLoop
```

- **Render resolution**: 320×200 (retro, easily changed in `renderer.js`)
- **Display**: pixel-perfect letterbox scale-up to full window, no interpolation
- **No canvas 2D primitives** used for scene drawing — everything goes through `PixelBuffer` to eliminate antialiasing

---

## Key Files

```
index.html                      Shell: black bg, centered canvas, pixelated CSS
src/main.js                     Entry: fonts → rasterize title → generateConfig → initRenderer → ticker → startLoop
src/common/renderer.js          initRenderer(canvas, palette) → { buffer, present }; exports RENDER_W, RENDER_H
                                startLoop(update)
src/common/pixelbuffer.js       PixelBuffer class — software rasterizer (see below)
src/common/palette.js           Named palette arrays (SUNSET, CRIMSON, OCEAN) + PALETTES export. Max 32 colors each.
src/common/font.js              rasterizeText(text, fontFamily, fontSize, scaleX, letterSpacing) → sprite
src/common/ticker.js            loadTickerText(url, start, end) + createTicker(sprite, speed)
src/common/parallax.js          createParallax(layers) → { update, drawTiled }
src/demo/sunset/config.js       generateSunsetConfig(titleSprite) → config — all per-session random choices
src/demo/sunset/sunset.js       Sunset demo — reads layout from config, no randomisation inside
src/demo/cube/                  (stub)
```

---

## PixelBuffer

Central rendering abstraction. Backed by `ImageData` (Uint8ClampedArray RGBA).

**Construction**: `new PixelBuffer(width, height, palette)`
- `palette`: array of CSS hex strings (the scene's 32-color palette)
- Pre-parses all hex to `[r,g,b]` for fast lookup

**All draw calls take a palette index (0–31)** — raw colors are not accepted. This enforces the 32-color constraint and enables palette swapping.

| Method | Description |
|---|---|
| `setPixel(x, y, idx)` | Single pixel |
| `fillRect(x, y, w, h, idx)` | Filled rectangle |
| `fillGradientH(stops)` | Horizontal banded gradient. `stops`: `[{y, idx}]` sorted by y — each row gets the color of the last stop whose y ≤ row |
| `fillCircle(cx, cy, r, idx)` | Rasterized filled circle, no antialiasing |
| `fillPolygon(points, idx, offsetX=0)` | Scanline polygon fill. `points`: `[[x,y],...]`. `offsetX` shifts all x for parallax |
| `blitSprite(sprite, x, y, idx)` | Draws a font/text sprite in palette color |
| `blitSpriteScrolled(sprite, x, y, idx, scrollX, viewW)` | Draws a horizontal window of a sprite with seamless wrap — used for ticker |
| `flush(ctx)` | `putImageData` to offscreen canvas |

**Internal**: `setPixelRaw(x, y, r, g, b)` — bounds-checked write bypassing palette lookup (used in tight loops).

---

## Renderer

`initRenderer(displayCanvas, palette)` returns `{ buffer, present, width, height }`.

- Creates a `PixelBuffer` at render resolution (320×200)
- Creates an offscreen canvas at the same resolution
- `present()`: flushes buffer → offscreen, then `drawImage` scales up to display canvas
- `applyScale()`: CSS letterbox scaling, recalculated on window resize
- `imageSmoothingEnabled = false` on all contexts

`startLoop(update)`: rAF loop, calls `update(dt)` where `dt` is seconds since last frame.

---

## Palette

Defined in `src/common/palette.js` as plain arrays of 32 hex strings.
The active palette is passed to `initRenderer` → `PixelBuffer` at startup.
Demos reference colors by **index only** — no hex strings in demo code.
Each demo defines a local `const P = { NAME: index, ... }` for readability.

Current palettes: `SUNSET`, `CRIMSON`, `OCEAN` — one is chosen at random on startup via `PALETTES` array export.

Slot layout (must be preserved when adding new palettes):
- 0–10: sky gradient, top → horizon
- 11–13: ground / water
- 14–17: mountain (body, darker peak, shadow, near-white highlight)
- 18–19: silhouette (near-black, for temple + trees)
- 20–23: cherry blossom petals
- 24–26: sun disc (bright, rim, edge)
- 27–31: UI / accent (white, black, grey, red, cyan)

---

## Font / Text

`rasterizeText(text, fontFamily, fontSize, scaleX=1, letterSpacing=1)` → `{ pixels: [[dx,dy],...], w, h }`

- Rasterizes **character by character** — each char to its own small canvas, placed manually
- This avoids browser canvas size limits (long strings overflow at ~16k px) and gives full letter spacing control
- Alpha threshold: **> 32** (not 127) — captures antialiased edge pixels that would otherwise drop out
- `scaleX`: integer horizontal pixel stretch (1=normal, 2=double-wide)
- `letterSpacing`: extra pixels between characters
- Returns a palette-agnostic sprite (just pixel offsets) — color applied at blit time
- Must be called **after** `document.fonts.ready`
- Static text: `buffer.blitSprite(sprite, x, y, idx)`
- Scrolling text: `buffer.blitSpriteScrolled(sprite, x, y, idx, scrollX, viewW)`

**Ticker** (`src/common/ticker.js`):
- `loadTickerText(url, startLine, endLine)`: `fetch` a text file, slice lines, join with ` · ` separator
- `createTicker(sprite, speed)` → `{ update(dt), getScrollX(), sprite }`: advances scrollX at speed px/sec, wraps at `sprite.w`

Web fonts loaded via Google Fonts `<link>` in `index.html`.
Current fonts: **Shojumaru** (title), **Press Start 2P** (ticker).

---

## Parallax

`createParallax(layers)` where `layers = [{ speed, wrapWidth }, ...]`

- `speed`: pixels per second
- `wrapWidth`: wrap period (usually 320 — one screen width)
- `update(dt)`: advances all offsets
- `drawTiled(i, fn)`: calls `fn(offsetX)` twice (at `-offset` and `wrapWidth - offset`) for seamless tiling

Layer convention (sunset demo):
| Index | Content | Speed |
|---|---|---|
| 0 | Mt. Fuji | 8 px/s |
| 1 | Temple | 16 px/s |
| 2 | Trees | 30 px/s |

---

## Sunset Demo — Layer Stack (back to front)

1. **Sky** — `fillGradientH`, palette indices 0–10, banded (no smooth gradient)
2. **Ground** — continuation of gradient stops, indices 11–12
3. **Sun** — three concentric `fillCircle` (glow edge → rim → bright disc)
4. **Mt. Fuji** — two polygons: body (idx 14) + snow cap (idx 15 shadow + idx 17 snow), layer 0 parallax
5. **Temple** — 5-part pagoda (body + 3 roof tiers + spire), each a polygon, layer 1 parallax
6. **Trees** — single 320-wide jagged-top strip polygon, tiled, layer 2 parallax
7. **Title** — `blitSprite`, Shojumaru font, centered horizontally, Y from config (random each session), palette idx 17 (SNOW)
8. **Ticker** — `blitSpriteScrolled`, Press Start 2P font, full-width dark bar, Y from config (random, above or below title with ≥30 px gap), palette idx 17 (SNOW)

Upcoming: cherry blossom boids (overlay).

---

## Session Config

`src/demo/sunset/config.js` — `generateSunsetConfig(titleSprite)` → `config`

Called in `main.js` after font rasterization (sprites are palette-agnostic) but before `initRenderer`.
All per-session random choices live here; the demo itself contains no `Math.random()` calls.

| Field | Description |
|---|---|
| `palette` | Chosen palette array (from `PALETTES`) |
| `paletteIdx` | Index into `PALETTES`; stored in `localStorage` to avoid repeats on refresh |
| `titleX` | Horizontal center position for title sprite |
| `titleY` | Random vertical position for title (top margin → bottom of screen) |
| `tickerY` | Random vertical position for ticker bar (above or below title, ≥ `TITLE_TICKER_GAP` px gap) |
| `tickerH` | Height of ticker bar in pixels (default 24) |

Tuneable constants exported from `config.js`: `TICKER_H`, `TITLE_TICKER_GAP`.

---

## Conventions

- Shapes defined in local 320-wide coordinate space; `offsetX` applied at draw time
- Demo `createXxxDemo(buffer, assets)` receives pre-built sprites + a `config` object
- Asset generation (font rasterization) happens in `main.js` after fonts load; config generated immediately after
- All randomisation is centralised in `config.js` — demos are deterministic given a config
- No state outside of demo factory closures
