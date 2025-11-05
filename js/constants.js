// js/constants.js
// Shared constants for CartonApp

window.CartonApp = window.CartonApp || {};
window.CartonApp.Constants = {
  // -------------------------------------------------
  // Default values for form initialization
  // -------------------------------------------------
  DEFAULT_VALUES: {
    carton: { l: 600, w: 400, h: 300 },
    limits: {
      palletL: 1200,
      palletW: 1000,
      palletH: 1200,
      cartonGrossMax: 25,
      palletGrossMax: 1600,
    },
  },

  // -------------------------------------------------
  // Common pallet presets
  // -------------------------------------------------
  PALLET_SIZES: [
    { label: "UK Standard (1200 × 1000 mm x 1200mm)", L: 1200, W: 1000, H: 1200 },
    { label: "Aldi Pallet (1200 × 1000 mm x 1600mm)", L: 1200, W: 1000, H: 1600 },
    { label: "LIDL Pallet (1200 × 800 mm x 1600mm)", L: 1200, W: 800, H: 1600 },
    { label: "Euro Pallet (1200 × 800 mm x 1200mm)", L: 1200, W: 800, H: 1200 },
    { label: "Half Pallet (800 × 600 mm x 800mm)", L: 800, W: 600, H: 800 },
    { label: "Custom size", L: null, W: null, H: null },
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
