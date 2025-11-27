// js/constants.js
// Shared constants for CartonApp

window.CartonApp = window.CartonApp || {};
window.CartonApp.Constants = {
  // -------------------------------------------------
  // Default values for form initialization
  // -------------------------------------------------
  DEFAULT_VALUES: {
    carton: { l: 600, w: 400, h: 300, weight: 10.0, innersPerCarton: 0 },
    limits: {
      palletL: 6058,
      palletW: 2438,
      palletH: 2591,
      cartonGrossMax: 25,
      palletGrossMax: 28000,
      desiredCartons: "",
    },
  },

  // -------------------------------------------------
  // Common pallet presets
  // -------------------------------------------------
  PALLET_SIZES: [
    { label: "20ft Container (6058 × 2438 mm x 2591mm)", L: 6058, W: 2438, H: 2591, WeightLimit: 28000 },
    { label: "40ft Container (12192 × 2438 mm x 2896mm)", L: 12192, W: 2438, H: 2896, WeightLimit: 32000 },
    { label: "Custom size", L: null, W: null, H: null, WeightLimit: null },
  ],

  
  //-------------------------------------------------
  // Group colors for carton groups
  // -------------------------------------------------

  GROUP_COLORS: [
    "#4a9eff", // blue
    "#f59e0b", // amber
    "#10b981", // green
    "#ef4444", // red
    "#8b5cf6", // purple
  ],

  // -------------------------------------------------
  // Orientation label mappings for 2D/3D drawing
  // -------------------------------------------------
  ORIENTATION_LABELS: {
    upright: { primary: "L", secondary: "W" },
    "upright-rotated": { primary: "W", secondary: "L" },
    "laid-side-l": { primary: "W", secondary: "H" },
    "laid-side-w": { primary: "L", secondary: "H" },
    "laid-h-l": { primary: "L", secondary: "H" },
    "laid-h-w": { primary: "H", secondary: "W" },
    mixed: { primary: "L", secondary: "W" },
  },

  // -------------------------------------------------
  // Color definitions for dimension labels
  // -------------------------------------------------
  DIMENSION_COLORS: {
    L: "#ef4444", // Red
    W: "#3b82f6", // Blue
    H: "#10b981", // Green
  },

  // -------------------------------------------------
  // Three.js visual constants
  // -------------------------------------------------
  THREE_CONFIG: {
    colors: {
      scene: 0xf5f5f5,
      ground: 0xe0e0e0,
      palletBase: 0x8b7355,
      heightGuide: 0x60a5fa,
      heightOutline: 0x3b82f6,
    },
    palletBaseHeight: 100,
  },
};
