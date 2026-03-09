// Demo registry — controls which demos run and optionally overrides their config.
//
// Keys:   demo names to include in the rotation.
// Values: plain objects merged into the generated config via Object.assign.
//
// Single entry → that demo always runs (useful for development).
// Multiple entries → random pick, never repeating back-to-back.
//
// Examples:
//   { drive: {} }                  — always run drive
//   { drive: { speed: 0.5 } }     — always run drive, override speed
//   { c64: {}, sunset: {}, drive: {} }  — full rotation (default)
export const DEMOS = {
  //c64:    {},
  //sunset: {},
  drive:  {},
};
