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

// Authentic Commodore 64 16-color palette (Colodore values), padded to 32.
export const C64_PALETTE = [
  '#000000', // 0  Black
  '#FFFFFF', // 1  White
  '#9F4E44', // 2  Red
  '#6ABFC6', // 3  Cyan
  '#A057A3', // 4  Purple
  '#5CAB5E', // 5  Green
  '#50459B', // 6  Blue        ← screen background
  '#C9D487', // 7  Yellow
  '#A1683C', // 8  Orange
  '#6D5412', // 9  Brown
  '#CB7E75', // 10 Light Red
  '#626262', // 11 Dark Grey
  '#898989', // 12 Grey
  '#9AE29B', // 13 Light Green
  '#887ECB', // 14 Light Blue  ← border + text
  '#ADADAD', // 15 Light Grey
  // slots 16–31: unused, padded with black
  '#000000','#000000','#000000','#000000',
  '#000000','#000000','#000000','#000000',
  '#000000','#000000','#000000','#000000',
  '#000000','#000000','#000000','#000000',
];

// OutRun-style daytime arcade palette for the drive demo.
// Slot layout differs from the sunset convention — drive owns its own indices.
//  0–3:   sky gradient (top → horizon)
//  4–5:   road surface (dark / light asphalt stripes)
//  6–7:   road-side grass (dark / light)
//  8–9:   rumble strip (red / white)
//  10:    center dashes (yellow)
//  11–26: unused (black padding)
//  27–31: UI (white, black, grey, red, cyan) — same as sunset convention
export const DRIVE_PALETTE = [
  '#0698ff', // 0  deep night blue (sky top)
  '#07a1ff', // 1  royal blue
  '#20b0ff', // 2  bright sky blue
  '#38c8ff', // 3  pale horizon haze
  '#252738', // 4  road dark (asphalt)
  '#2a2d38', // 5  road light (asphalt stripe)
  '#1a6320', // 6  grass dark
  '#1a6e22', // 7  grass light
  '#cc2200', // 8  rumble red
  '#e0e0e0', // 9  rumble white
  '#909c00', // 10 center-line yellow
  '#1a6721', // 11 grass avg
  '#1a6a21', // 12 grass avg - light
  '#100804', // 13 palm shadow / outline
  '#3a1808', // 14 palm trunk dark
  '#8a4818', // 15 palm trunk mid
  '#d07828', // 16 palm trunk light (orange-tan + coconuts)
  '#186008', // 17 palm leaf dark
  '#3a8010', // 18 palm leaf mid
  '#90d020', // 19 palm leaf light (bright lime)
  // Car sprite layers (slots 20–25)
  '#080608', // 20 car shadow / outline
  '#cc1010', // 21 car body red
  '#12101e', // 22 car interior / windshield dark
  '#e8c820', // 23 car helmet yellow
  '#7828b0', // 24 car helmet purple
  '#d8d8d8', // 25 car detail white (tail lights, chrome)
  '#000000', // 26 unused
  // UI — same positions as sunset palettes
  '#ffffff', // 27 white
  '#000000', // 28 black
  '#aaaaaa', // 29 grey
  '#ff3355', // 30 red accent
  '#00ffcc', // 31 cyan accent
];

// Desert / off-road palette — scorched earth, heat haze, sparse dry palms.
// Rumble slots (8-9) intentionally match ground to make strips invisible.
export const DRIVE_DESERT = [
  // Sky — baked rust through pale sandy haze
  '#120800', // 0  near-black scorched sky
  '#3a1400', // 1  deep rust
  '#7a3e10', // 2  amber-brown
  '#c87c38', // 3  pale sandy horizon haze
  // Road — warm asphalt + sand-gravel stripe
  '#1c1810', // 4  road dark (warm asphalt)
  '#b08838', // 5  road light (sand/gravel texture)
  // Ground — desert sand
  '#c08820', // 6  sand dark
  '#d4a838', // 7  sand light
  '#c08820', // 8  "rumble red"  = sand dark (invisible, no rumble on dirt)
  '#d4a838', // 9  "rumble white" = sand light (invisible)
  '#906818', // 10 center-line (muted, config disables it anyway)
  '#c89030', // 11 sand avg
  '#cca038', // 12 sand avg-light
  // Palm — dry, sparse, desert-adapted (warm browns, dead fronds)
  '#100400', // 13 shadow
  '#301000', // 14 trunk dark
  '#7a3010', // 15 trunk mid (burnt orange-brown)
  '#ac4c18', // 16 trunk light
  '#181000', // 17 leaf dark (dried, near-black)
  '#301c04', // 18 leaf mid (dark olive)
  '#443008', // 19 leaf light (dry olive-brown)
  // Car — same across all drive palettes
  '#080608', // 20 car shadow
  '#cc1010', // 21 car body red
  '#12101e', // 22 car interior
  '#e8c820', // 23 helmet yellow
  '#7828b0', // 24 helmet purple
  '#d8d8d8', // 25 car detail white
  '#000000', // 26 unused
  '#ffffff', '#000000', '#aaaaaa', '#ff3355', '#00ffcc', // 27-31 UI
];

// Night drive palette — deep navy sky, dark asphalt, heavy fog, palm silhouettes.
export const DRIVE_NIGHT = [
  // Sky — near-black through deep blue-purple
  '#000210', // 0  midnight black
  '#000a22', // 1  deep navy
  '#001a40', // 2  midnight blue
  '#0a2c68', // 3  blue-purple horizon haze
  // Road — dark asphalt, barely-visible stripe
  '#121520', // 4  road dark
  '#1c2034', // 5  road light (subtle cool blue-grey)
  // Ground — near-black with blue tint
  '#040810', // 6  ground dark
  '#07101c', // 7  ground light
  '#601010', // 8  rumble red (faint, like distant brake lights)
  '#182038', // 9  rumble white (dim moonlit blue)
  '#28260a', // 10 center-line (faded old paint, dim amber)
  '#050c18', // 11 ground avg
  '#060e1c', // 12 ground avg-light
  // Palm — dark silhouettes against night sky
  '#020204', // 13 shadow
  '#07050a', // 14 trunk dark
  '#100c10', // 15 trunk mid
  '#181218', // 16 trunk light
  '#020408', // 17 leaf dark
  '#03060c', // 18 leaf mid
  '#050a12', // 19 leaf light
  // Car
  '#080608', '#cc1010', '#12101e', '#e8c820', '#7828b0', '#d8d8d8',
  '#000000',
  '#ffffff', '#000000', '#aaaaaa', '#ff3355', '#00ffcc',
];

// Synthwave palette — deep indigo sky, neon rumble, electric palm silhouettes.
export const DRIVE_SYNTHWAVE = [
  // Sky — deep indigo to vivid violet
  '#04000f', // 0  near-black indigo
  '#0e0038', // 1  deep purple
  '#2c0070', // 2  electric purple
  '#6000c8', // 3  vivid violet horizon haze
  // Road — near-black with dark purple stripe
  '#070710', // 4  road dark
  '#180848', // 5  road light (dark neon purple)
  // Ground — near-black purple
  '#03000c', // 6  ground dark
  '#06001c', // 7  ground light
  '#c80080', // 8  rumble = hot magenta
  '#00c8c8', // 9  rumble = electric cyan
  '#c000c0', // 10 center-line = magenta
  '#050018', // 11 ground avg
  '#07001e', // 12 ground avg-light
  // Palm — neon purple silhouettes
  '#030014', // 13 shadow
  '#180030', // 14 trunk dark (deep purple)
  '#3c005c', // 15 trunk mid
  '#6800a0', // 16 trunk light (bright purple)
  '#000830', // 17 leaf dark (deep indigo)
  '#001060', // 18 leaf mid
  '#001898', // 19 leaf light (electric blue)
  // Car
  '#080608', '#cc1010', '#12101e', '#e8c820', '#7828b0', '#d8d8d8',
  '#000000',
  '#ffffff', '#000000', '#aaaaaa', '#ff3355', '#00ffcc',
];

// All available palettes — one is chosen at random on startup.
export const PALETTES = [SUNSET, CRIMSON, OCEAN];
