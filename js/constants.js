// js/constants.js
// Shared constants for CartonApp

window.CartonApp = window.CartonApp || {};
window.CartonApp.Constants = {
  // -------------------------------------------------
  // Default values for form initialization
  // -------------------------------------------------
  DEFAULT_VALUES: {
    product: { l: 100, w: 100, h: 50, weight: 0.5 },
    carton: { l: 600, w: 400, h: 300 },
    limits: {
      palletL: 1200,
      palletW: 1000,
      palletH: 1350,
      cartonGrossMax: 25,
    },
  },

  // -------------------------------------------------
  // Common pallet presets
  // -------------------------------------------------
  PALLET_SIZES: [
    { label: "UK Standard (1200 × 1000 × 1350)", L: 1200, W: 1000, H: 1350 },
    { label: "Euro Pallet (1200 × 800 × 1350)", L: 1200, W: 800, H: 1350 },
    { label: "Half Pallet (1000 × 600 × 1000)", L: 1000, W: 600, H: 1000 },
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
