let cachedHeight = 0;
let scanlineTable = null;

let fadeBlack = 0;
export function setFade(t) { fadeBlack = Math.max(0, Math.min(1, t)); }

function updateScanlineTable(h, strength) {
    scanlineTable = new Float32Array(h);
    for (let y = 0; y < h; y++) {
        // Creates the horizontal "ribbed" texture
        scanlineTable[y] = 1.0 - (Math.abs(Math.sin(y * Math.PI * 0.5)) * strength);
    }
    cachedHeight = h;
}

/**
 * @param {ImageData} imageData - The buffer to modify
 * @param {Object} options - Effect controls
 * @param {number} options.scanlineStrength - Darkening of lines (0.0 - 1.0)
 * @param {number} options.vignetteStrength - Darkening of corners (0.0 - 1.0)
 * @param {number} options.vignetteExtent - How far inward it spreads (e.g., 0.2 - 0.5)
 */
export function applyFullCRTEffect(imageData, { 
    scanlineStrength = 0.02, 
    vignetteStrength = 0.55, 
    vignetteExtent = 0.2,
    boost = 1.25 
} = {}) {
    const data = imageData.data;
    const w = imageData.width;
    const h = imageData.height;
    
    if (h !== cachedHeight) {
        updateScanlineTable(h, scanlineStrength);
    }

    const centerX = w / 2;
    const centerY = h / 2;

    for (let y = 0; y < h; y++) {
        const scanline = scanlineTable[y];
        const normY = (y - centerY) / centerY;

        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const normX = (x - centerX) / centerX;

            // 1. Controlled Vignette
            // dist is 0 at center, ~1.0 at mid-edges, and ~2.0 at corners
            const dist = (normX * normX) + (normY * normY);

            // We use an exponential falloff. 
            // Increasing 'vignetteExtent' makes the "clear circle" in the middle smaller.
            // 'vignetteStrength' determines how much of the original color we keep at the darkest point.
            const vignette = Math.max(
                1.0 - vignetteStrength, 
                Math.pow(Math.max(0, 1.0 - (dist * vignetteExtent)), 2)
            );

            // 2. Vertical Bleed (Phosphor Glow)
            let r = data[i], g = data[i + 1], b = data[i + 2];
            if (y > 0) {
                const above = ((y - 1) * w + x) * 4;
                r = (r * 0.88) + (data[above] * 0.12);
                g = (g * 0.88) + (data[above + 1] * 0.12);
                b = (b * 0.88) + (data[above + 2] * 0.12);
            }

            // 3. Final Multiplier
            const finalMult = scanline * vignette * boost * (1 - fadeBlack);
            
            data[i]     = Math.min(255, r * finalMult);
            data[i + 1] = Math.min(255, g * finalMult);
            data[i + 2] = Math.min(255, b * finalMult);
        }
    }
}