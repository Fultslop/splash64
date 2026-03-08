// Palette — a named set of up to 32 colors.
// Colors are CSS hex strings. Index 0 is conventionally the background/sky top.
//
// Slot layout (shared convention across all palettes):
//  0–10  sky gradient, top → horizon
//  11–13 ground / water
//  14–17 mountain (body, darker, shadow, near-white highlight)
//  18–19 silhouette (near-black, for temple + trees)
//  20–23 cherry blossom petals
//  24–26 sun disc (bright, rim, edge)
//  27–31 UI / accent (white, black, grey, red, cyan)

export const SUNSET = [
  // Sky — top to horizon
  '#0d0221', // 0  deep indigo night
  '#1a0533', // 1
  '#2e0d4e', // 2
  '#4b1070', // 3
  '#6b1f8a', // 4
  '#8c2fa0', // 5
  '#b84db0', // 6
  '#d96ab8', // 7
  '#f08080', // 8  warm salmon
  '#f4a04a', // 9  orange glow
  '#f7c56a', // 10 yellow horizon
  // Ground / water
  '#1a0a2e', // 11 dark ground
  '#2a1040', // 12
  '#3d1a55', // 13
  // Mt Fuji / mountain silhouette
  '#6e3580', // 14 distant mountain purple
  '#4a2060', // 15 darker peak
  '#2e0d4e', // 16 snow cap shadow
  '#f5f0ff', // 17 near-white snow
  // Temple / tree silhouettes
  '#0a0015', // 18 near-black silhouette
  '#150025', // 19 silhouette mid
  // Cherry blossom
  '#ffb7c5', // 20 petal light
  '#ff85a1', // 21 petal mid
  '#e05070', // 22 petal dark
  '#fff0f5', // 23 petal highlight
  // Sun disc
  '#ffe040', // 24 sun bright
  '#ffaa00', // 25 sun rim
  '#ff6020', // 26 sun edge
  // Accent / ui
  '#ffffff', // 27 white
  '#000000', // 28 black
  '#aaaaaa', // 29 grey
  '#ff3355', // 30 red accent
  '#00ffcc', // 31 cyan accent
];

// Fire / desert sunset — deep crimsons through amber gold.
export const CRIMSON = [
  // Sky — top to horizon
  '#0c0100', // 0  near-black with red warmth
  '#1e0300', // 1
  '#3a0800', // 2
  '#620f00', // 3
  '#8c1f00', // 4
  '#b43600', // 5
  '#d45220', // 6
  '#e87248', // 7
  '#f09468', // 8  burnt orange
  '#f7bc84', // 9  warm amber
  '#fcd8a0', // 10 gold horizon
  // Ground / water
  '#060000', // 11 near-black ground
  '#100500', // 12
  '#200e00', // 13
  // Mt Fuji / mountain silhouette
  '#5e1500', // 14 dark rust mountain
  '#3c0900', // 15 deeper rust
  '#200500', // 16 shadow
  '#fff7e8', // 17 warm near-white (for title + ticker)
  // Temple / tree silhouettes
  '#030000', // 18 near-black silhouette
  '#080100', // 19 silhouette mid
  // Cherry blossom (warm, fire-toned)
  '#ffcc90', // 20 petal light
  '#ff9048', // 21 petal mid
  '#cc4010', // 22 petal dark
  '#fff4e8', // 23 petal highlight
  // Sun disc (white-hot)
  '#ffffee', // 24 sun bright
  '#fff4a0', // 25 sun rim
  '#ffb820', // 26 sun edge
  // Accent / ui
  '#ffffff', // 27 white
  '#000000', // 28 black
  '#aaaaaa', // 29 grey
  '#ff3355', // 30 red accent
  '#00ffcc', // 31 cyan accent
];

// Coastal twilight — deep navy through teal, with a warm gold sun.
export const OCEAN = [
  // Sky — top to horizon
  '#000810', // 0  deep ocean night
  '#001020', // 1
  '#001c38', // 2
  '#002e52', // 3
  '#004268', // 4
  '#006080', // 5
  '#108898', // 6
  '#28a8a8', // 7
  '#50c4b8', // 8  aqua
  '#8adcc8', // 9  pale mint
  '#b8f0e0', // 10 aqua horizon
  // Ground / water
  '#000808', // 11 near-black teal ground
  '#001018', // 12
  '#001822', // 13
  // Mt Fuji / mountain silhouette
  '#105060', // 14 slate-teal mountain
  '#062e3c', // 15 deeper slate
  '#001820', // 16 shadow
  '#e8fefa', // 17 cool near-white (for title + ticker)
  // Temple / tree silhouettes
  '#000508', // 18 near-black silhouette
  '#000c15', // 19 silhouette mid
  // Cherry blossom (aqua-tinted)
  '#a0e8e8', // 20 petal light
  '#58c8c0', // 21 petal mid
  '#208880', // 22 petal dark
  '#e0f8f8', // 23 petal highlight
  // Sun disc (pale gold)
  '#fffff0', // 24 sun bright
  '#ffd860', // 25 sun rim
  '#ff9428', // 26 sun edge
  // Accent / ui
  '#ffffff', // 27 white
  '#000000', // 28 black
  '#aaaaaa', // 29 grey
  '#ff3355', // 30 red accent
  '#00ffcc', // 31 cyan accent
];

// All available palettes — one is chosen at random on startup.
export const PALETTES = [SUNSET, CRIMSON, OCEAN];

// Returns an object mapping name->hex for a given palette array.
export function buildPalette(colors) {
  return colors.reduce((map, hex, i) => {
    map[i] = hex;
    return map;
  }, {});
}
