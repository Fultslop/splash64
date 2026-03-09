// Parallax — tracks horizontal scroll offsets for N layers.
// Each layer has a speed (px/sec, negative = right-to-left). Offsets wrap at wrapWidth so
// shapes can be drawn tiled: once at -offset, once at wrapWidth - offset.

export function createParallax(layers, direction = 1) {
  // layers: array of { speed, wrapWidth }
  const offsets = layers.map(() => 0);
  
  function update(dt) {
    for (let i = 0; i < layers.length; i++) {
      const w = layers[i].wrapWidth;
      offsets[i] = ((offsets[i] + layers[i].speed * dt * direction) % w + w) % w;
    }
  }

  // Returns the pixel offset for layer i (always positive, < wrapWidth).
  function getOffset(i) {
    return Math.floor(offsets[i]);
  }

  // Helper: call drawFn(offsetX) twice to seamlessly tile a layer.
  function drawTiled(i, drawFn) {
    const ox = getOffset(i);
    const w  = layers[i].wrapWidth;
    drawFn(-ox);
    drawFn(w - ox);
  }

  return { update, getOffset, drawTiled };
}
