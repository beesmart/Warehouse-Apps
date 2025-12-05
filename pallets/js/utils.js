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

  // -------------------------------------------------
  // URL Parameter utilities
  // -------------------------------------------------

  // Parse URL params into carton and pallet config
  parseUrlParams: function () {
    const params = new URLSearchParams(window.location.search);
    const result = { carton: null, pallet: null, preset: null };

    // Parse carton: "270x435x350" -> { l: 270, w: 435, h: 350 }
    const cartonParam = params.get("carton");
    if (cartonParam) {
      const parts = cartonParam.split("x").map(Number);
      if (parts.length === 3 && parts.every((n) => !isNaN(n) && n > 0)) {
        result.carton = { l: parts[0], w: parts[1], h: parts[2] };
      }
    }

    // Parse pallet preset OR custom dimensions
    const presetParam = params.get("preset");
    const palletParam = params.get("pallet");

    if (presetParam) {
      // Find matching preset by slug
      const presets = window.CartonApp.Constants.PALLET_SIZES;
      const preset = presets.find(
        (p) => window.CartonApp.Utils.toPresetSlug(p.label) === presetParam
      );
      if (preset && preset.L) {
        result.preset = presetParam;
        result.pallet = { L: preset.L, W: preset.W, H: preset.H };
      }
    } else if (palletParam) {
      // Parse custom pallet: "1000x1200x2000" -> { L: 1000, W: 1200, H: 2000 }
      const parts = palletParam.split("x").map(Number);
      if (parts.length === 3 && parts.every((n) => !isNaN(n) && n > 0)) {
        result.pallet = { L: parts[0], W: parts[1], H: parts[2] };
      }
    }

    return result;
  },

  // Update URL params without page reload
  updateUrlParams: function (carton, limits, presetLabel) {
    const params = new URLSearchParams();

    // Add carton dimensions
    if (carton.l > 0 && carton.w > 0 && carton.h > 0) {
      params.set("carton", `${carton.l}x${carton.w}x${carton.h}`);
    }

    // Add pallet - either preset slug or custom dimensions
    const presets = window.CartonApp.Constants.PALLET_SIZES;
    const matchedPreset = presets.find(
      (p) => p.L === limits.palletL && p.W === limits.palletW && p.H === limits.palletH
    );

    if (matchedPreset && matchedPreset.L !== null) {
      // Use preset slug
      params.set("preset", window.CartonApp.Utils.toPresetSlug(matchedPreset.label));
    } else if (limits.palletL > 0 && limits.palletW > 0 && limits.palletH > 0) {
      // Use custom dimensions
      params.set("pallet", `${limits.palletL}x${limits.palletW}x${limits.palletH}`);
    }

    // Update URL without reload
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.replaceState({}, "", newUrl);
  },

  // Convert preset label to URL-friendly slug
  toPresetSlug: function (label) {
    if (!label) return "";
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  },
};
