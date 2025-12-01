window.CartonApp.Algorithms = {
  bestTile: function (boxL, boxW, boxH, spaceL, spaceW, spaceH, allowVerticalFlip = true) {
    // Validate inputs
    if (boxL <= 0 || boxW <= 0 || boxH <= 0 || spaceL <= 0 || spaceW <= 0 || spaceH <= 0) {
      return emptyResult();
    }

    const orientations = [
      { l: boxL, w: boxW, h: boxH, label: "upright" },
      { l: boxW, w: boxL, h: boxH, label: "upright-rotated" },
    ];

    if (allowVerticalFlip) {
      orientations.push(
        { l: boxW, w: boxH, h: boxL, label: "laid-side-l" },
        { l: boxL, w: boxH, h: boxW, label: "laid-side-w" },
        { l: boxH, w: boxL, h: boxW, label: "laid-h-l" },
        { l: boxH, w: boxW, h: boxL, label: "laid-h-w" }
      );
    }

    // We'll test both pallet orientations: normal and swapped (L↔W)
    const palletVariants = [
      { L: spaceL, W: spaceW, swapped: false },
      { L: spaceW, W: spaceL, swapped: true },
    ];

    const candidates = [];

    // --- Helper: fit a pattern given dimensions
    const fitPattern = (o, pallet, labelSuffix = "") => {
      const countL = Math.floor(pallet.L / o.l);
      const countW = Math.floor(pallet.W / o.w);
      const layers = Math.floor(spaceH / o.h);
      if (countL <= 0 || countW <= 0 || layers <= 0) return null;

      const perLayer = countL * countW;
      return {
        pattern: o.label + labelSuffix,
        countL,
        countW,
        layers,
        perLayer,
        total: perLayer * layers,
        boxL: o.l,
        boxW: o.w,
        boxH: o.h,
        usedL: countL * o.l,
        usedW: countW * o.w,
        usedH: layers * o.h,
        patternRows: null,
        palletSwapped: pallet.swapped,
      };
    };

    // --- Helper: mixed pattern alternating rows
    const fitMixed = (o, pallet, labelSuffix = "") => {
      if (o.l === o.w) return null;
      const layers = Math.floor(spaceH / o.h);
      if (layers <= 0) return null;

      const patternRows = [];
      let remainingW = pallet.W;
      let totalInLayer = 0;
      let usedL = 0;
      let usedW = 0;
      let rowIndex = 0;

      while (remainingW >= Math.min(o.l, o.w)) {
        const rotated = rowIndex % 2 === 1;
        const rowL = rotated ? o.w : o.l;
        const rowW = rotated ? o.l : o.w;

        if (remainingW < rowW) break;
        const cols = Math.floor(pallet.L / rowL);
        if (cols <= 0) break;

        patternRows.push({ rotated, countL: cols, boxL: rowL, boxW: rowW });
        totalInLayer += cols;
        usedL = Math.max(usedL, cols * rowL);
        usedW += rowW;
        remainingW -= rowW;
        rowIndex++;
      }

      if (!patternRows.length) return null;

      return {
        pattern: "mixed-" + o.label + labelSuffix,
        countL: null,
        countW: null,
        layers,
        perLayer: totalInLayer,
        total: totalInLayer * layers,
        boxL: o.l,
        boxW: o.w,
        boxH: o.h,
        usedL,
        usedW,
        usedH: layers * o.h,
        patternRows,
        palletSwapped: pallet.swapped,
      };
    };

    // --- Try all orientations, both normal & swapped pallets
    palletVariants.forEach((pallet) => {
      orientations.forEach((o) => {
        const uniform = fitPattern(o, pallet, pallet.swapped ? "-pallet-swapped" : "");
        if (uniform) candidates.push(uniform);

        const mixed = fitMixed(o, pallet, pallet.swapped ? "-pallet-swapped" : "");
        if (mixed) candidates.push(mixed);
      });
    });

    if (!candidates.length) return emptyResult();

    // Sort by total cartons, then per-layer efficiency
    candidates.sort((a, b) => b.total - a.total || b.perLayer - a.perLayer);

    const best = candidates[0];
    return best;
  },
};

// --- Helper for empty result object ---
function emptyResult() {
  return {
    countL: 0,
    countW: 0,
    layers: 0,
    perLayer: 0,
    total: 0,
    boxL: 0,
    boxW: 0,
    boxH: 0,
    usedL: 0,
    usedW: 0,
    usedH: 0,
    pattern: "none",
    patternRows: null,
    palletSwapped: false,
  };
}
