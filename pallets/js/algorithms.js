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
        boxPositions: null,
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
        boxPositions: null,
        palletSwapped: pallet.swapped,
      };
    };

    // --- Helper: pinwheel/interlocking pattern with gap filling
    // This places boxes individually and tries to fill gaps with rotated boxes
    const fitPinwheel = (o, pallet, labelSuffix = "") => {
      if (o.l === o.w) return null; // No benefit if box is square
      const layers = Math.floor(spaceH / o.h);
      if (layers <= 0) return null;

      // We'll use a greedy bin-packing approach for a single layer
      // Try multiple pinwheel strategies and pick the best
      const strategies = [
        () => fitPinwheelStrategy1(o, pallet),
        () => fitPinwheelStrategy2(o, pallet),
        () => fitPinwheelStrategy3(o, pallet),
      ];

      let bestPositions = [];
      for (const strategy of strategies) {
        const positions = strategy();
        if (positions.length > bestPositions.length) {
          bestPositions = positions;
        }
      }

      if (bestPositions.length === 0) return null;

      // Calculate bounding box of used space
      let maxX = 0, maxZ = 0;
      for (const pos of bestPositions) {
        maxX = Math.max(maxX, pos.x + pos.l);
        maxZ = Math.max(maxZ, pos.z + pos.w);
      }

      return {
        pattern: "pinwheel-" + o.label + labelSuffix,
        countL: null,
        countW: null,
        layers,
        perLayer: bestPositions.length,
        total: bestPositions.length * layers,
        boxL: o.l,
        boxW: o.w,
        boxH: o.h,
        usedL: maxX,
        usedW: maxZ,
        usedH: layers * o.h,
        patternRows: null,
        boxPositions: bestPositions,
        palletSwapped: pallet.swapped,
      };
    };

    // Strategy 1: Fill rows, then try to fit rotated boxes in remaining L-space
    // Uses occupancy grid to prevent overlaps
    function fitPinwheelStrategy1(o, pallet) {
      const positions = [];
      const L = pallet.L;
      const W = pallet.W;

      // Create occupancy grid to track placed boxes
      const grid = [];
      for (let i = 0; i < L; i++) {
        grid[i] = new Array(W).fill(false);
      }

      const canPlace = (x, z, l, w) => {
        if (x + l > L || z + w > W) return false;
        for (let i = x; i < x + l; i++) {
          for (let j = z; j < z + w; j++) {
            if (grid[i][j]) return false;
          }
        }
        return true;
      };

      const placeBox = (x, z, l, w, rotated) => {
        for (let i = x; i < x + l; i++) {
          for (let j = z; j < z + w; j++) {
            grid[i][j] = true;
          }
        }
        positions.push({ x, z, l, w, rotated });
      };

      // First, fill with primary orientation in rows
      let z = 0;
      while (z + o.w <= W) {
        let x = 0;
        while (x + o.l <= L) {
          if (canPlace(x, z, o.l, o.w)) {
            placeBox(x, z, o.l, o.w, false);
          }
          x += o.l;
        }
        // Check if we can fit a rotated box in the remaining L space
        const remainingL = L - x;
        if (remainingL >= o.w && canPlace(x, z, o.w, o.l)) {
          placeBox(x, z, o.w, o.l, true);
        }
        z += o.w;
      }

      // Check remaining W space for rotated boxes
      const remainingW = W - z;
      if (remainingW >= o.l) {
        let x = 0;
        while (x + o.w <= L) {
          if (canPlace(x, z, o.w, o.l)) {
            placeBox(x, z, o.w, o.l, true);
          }
          x += o.w;
        }
      }

      return positions;
    }

    // Strategy 2: Alternating orientation rows (classic pinwheel)
    // Uses occupancy grid to prevent overlaps
    function fitPinwheelStrategy2(o, pallet) {
      const positions = [];
      const L = pallet.L;
      const W = pallet.W;

      // Create occupancy grid to track placed boxes
      const grid = [];
      for (let i = 0; i < L; i++) {
        grid[i] = new Array(W).fill(false);
      }

      const canPlace = (x, z, l, w) => {
        if (x + l > L || z + w > W) return false;
        for (let i = x; i < x + l; i++) {
          for (let j = z; j < z + w; j++) {
            if (grid[i][j]) return false;
          }
        }
        return true;
      };

      const placeBox = (x, z, l, w, rotated) => {
        for (let i = x; i < x + l; i++) {
          for (let j = z; j < z + w; j++) {
            grid[i][j] = true;
          }
        }
        positions.push({ x, z, l, w, rotated });
      };

      let z = 0;
      let rowIndex = 0;
      while (z < W) {
        const rotated = rowIndex % 2 === 1;
        const rowL = rotated ? o.w : o.l;
        const rowW = rotated ? o.l : o.w;

        if (z + rowW > W) {
          // Try the other orientation for this last row
          const altL = !rotated ? o.w : o.l;
          const altW = !rotated ? o.l : o.w;
          if (z + altW <= W) {
            let x = 0;
            while (x + altL <= L) {
              if (canPlace(x, z, altL, altW)) {
                placeBox(x, z, altL, altW, !rotated);
              }
              x += altL;
            }
          }
          break;
        }

        let x = 0;
        while (x + rowL <= L) {
          if (canPlace(x, z, rowL, rowW)) {
            placeBox(x, z, rowL, rowW, rotated);
          }
          x += rowL;
        }

        // Try to fill gap at end of row with opposite orientation
        const gapL = L - x;
        const altL = rotated ? o.l : o.w;
        const altW = rotated ? o.w : o.l;
        if (gapL >= altL && canPlace(x, z, altL, altW)) {
          placeBox(x, z, altL, altW, !rotated);
        }

        z += rowW;
        rowIndex++;
      }

      return positions;
    }

    // Strategy 3: Block placement with gap filling
    function fitPinwheelStrategy3(o, pallet) {
      const positions = [];
      const L = pallet.L;
      const W = pallet.W;

      // Create occupancy grid (use 1mm cells for accuracy)
      const grid = [];
      for (let i = 0; i < L; i++) {
        grid[i] = new Array(W).fill(false);
      }

      const canPlace = (x, z, l, w) => {
        if (x + l > L || z + w > W) return false;
        for (let i = x; i < x + l; i++) {
          for (let j = z; j < z + w; j++) {
            if (grid[i][j]) return false;
          }
        }
        return true;
      };

      const placeBox = (x, z, l, w, rotated) => {
        for (let i = x; i < x + l; i++) {
          for (let j = z; j < z + w; j++) {
            grid[i][j] = true;
          }
        }
        positions.push({ x, z, l, w, rotated });
      };

      // First pass: place boxes in grid pattern
      let z = 0;
      while (z + o.w <= W) {
        let x = 0;
        while (x + o.l <= L) {
          if (canPlace(x, z, o.l, o.w)) {
            placeBox(x, z, o.l, o.w, false);
          }
          x += o.l;
        }
        z += o.w;
      }

      // Second pass: try to fill gaps with rotated boxes
      // Scan for empty spaces that can fit rotated boxes
      for (let z = 0; z + o.l <= W; z++) {
        for (let x = 0; x + o.w <= L; x++) {
          if (canPlace(x, z, o.w, o.l)) {
            placeBox(x, z, o.w, o.l, true);
          }
        }
      }

      return positions;
    }

    // --- Try all orientations, both normal & swapped pallets
    palletVariants.forEach((pallet) => {
      orientations.forEach((o) => {
        const uniform = fitPattern(o, pallet, pallet.swapped ? "-pallet-swapped" : "");
        if (uniform) candidates.push(uniform);

        const mixed = fitMixed(o, pallet, pallet.swapped ? "-pallet-swapped" : "");
        if (mixed) candidates.push(mixed);

        const pinwheel = fitPinwheel(o, pallet, pallet.swapped ? "-pallet-swapped" : "");
        if (pinwheel) candidates.push(pinwheel);
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
