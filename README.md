# Splash 64

**[▶ View Live Demos](https://fultslop.github.io/splash64/)**

---

Pixel-perfect splash screens built from scratch — no frameworks, no canvas primitives.

Inspired by C64 demo scene and arcade attract modes. Every frame is written pixel-by-pixel into a 32-color palette buffer and scaled to fill your screen without a single interpolated edge.

## What it does

- **C64 boot sequence** — LOAD, RUN, then a printer crawling out your message one character at a time
- **Sunset** — parallax Mt. Fuji, temple silhouette, scrolling title and ticker; palette randomized each visit
- Each reload picks a (somewhat) different demo, guaranteed

## How it's built

Pure JS (ES6+) and HTML5 Canvas. Zero npm packages. A custom pixel renderer, palette system, and font rasterizer — all hand-rolled. Built collaboratively with Claude as a coding agent.

## Run locally

```bash
# any static file server works, e.g.:
npx serve .
# or
python -m http.server
```

Open `http://localhost:3000` (or whatever port). A dev server is required — ES modules need it.

## Architecture

See [doc/agent/architecture.md](doc/agent/architecture.md) for the full render pipeline, APIs, and conventions.
