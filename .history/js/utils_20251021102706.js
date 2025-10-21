// js/utils.js
// Shared utility functions for CartonApp

window.CartonApp = window.CartonApp || {};
window.CartonApp.Utils = {
  // -------------------------------------------------
  // Numeric input handler
  // -------------------------------------------------
  handleNumberInput: function (setter, obj, key, value) {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      setter({ ...obj, [key]: num });
    }
  },

  // -------------------------------------------------
  // Number formatting (adds commas, rounds)
  // -------------------------------------------------
  numberFmt: function (num) {
    if (num == null || isNaN(num)) return "0";
    return num.toLocaleString("en-GB");
  },

  // -------------------------------------------------
  // Visible dimension labels by orientation
  // -------------------------------------------------
  getVisibleLabels: function (pattern = "") {
    const labels = window.CartonApp.Constants.ORIENTATION_LABELS;
    const base = pattern.replace("mixed-", "");
    return labels[base] || labels.upright;
  },

  // -------------------------------------------------
  // Row-specific labels for mixed patterns
  // -------------------------------------------------
  getRowLabels: function (pattern, rotated) {
    const labels = window.CartonApp.Utils.getVisibleLabels(pattern);
    if (pattern.startsWith("mixed") && rotated) {
      return { primary: labels.secondary, secondary: labels.primary };
    }
    return labels;
  },

  // -------------------------------------------------
  // Compute total pallet weight
  // -------------------------------------------------
  computeTotalWeight: function (unitsPerCarton, cartonWeight, perLayer, layers) {
    const cartons = perLayer * layers;
    const totalWeight = cartons * cartonWeight;
    const totalUnits = cartons * unitsPerCarton;
    return { cartons, totalWeight, totalUnits };
  },

  // -------------------------------------------------
  // Percentage of pallet volume used
  // -------------------------------------------------
  computeVolumeUsage: function (usedVol, totalVol) {
    if (totalVol <= 0) return 0;
    return (usedVol / totalVol) * 100;
  },
};
