// js/algorithms.js
window.CartonApp = window.CartonApp || {};
window.CartonApp.Constants = window.CartonApp.Constants || {};
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

// --------------------------------------------
// Multi-group packer with HEIGHTMAP-BASED placement
// This ensures boxes respect gravity and fill empty space
// --------------------------------------------
window.CartonApp.Constants = window.CartonApp.Constants || {};

(function () {
  const Algorithms = window.CartonApp.Algorithms;
  const GROUP_COLORS = window.CartonApp.Constants.GROUP_COLORS || [
    "#4a9eff",
    "#f97316",
    "#22c55e",
    "#a855f7",
    "#ec4899",
  ];

  /**
   * Multi-group packer using heightmap-based placement
   *
   * Instead of simple shelf-style layers, we use a 2D heightmap that tracks
   * the current height at each position on the pallet. This ensures:
   *  - Boxes respect gravity (placed on the highest surface below them)
   *  - Empty floor space is filled before stacking
   *  - Mixed box sizes work correctly
   *
   * @param {Array} groups - [{ id, name, l, w, h, qty, color? }, ...]
   * @param {Object} limits - { palletL, palletW, palletH }
   * @param {boolean} allowVerticalFlip - (reserved for future use)
   */
  Algorithms.packGroups = function packGroups(groups, limits, allowVerticalFlip) {
    const palletL = Number(limits.palletL) || 0;
    const palletW = Number(limits.palletW) || 0;
    const palletH = Number(limits.palletH) || 0;

    if (palletL <= 0 || palletW <= 0 || palletH <= 0) {
      return {
        multi: true,
        palletL,
        palletW,
        palletH,
        totalCartons: 0,
        totalLayers: 0,
        totalVolume: 0,
        usedL: 0,
        usedW: 0,
        usedH: 0,
        groups: [],
        palletSwapped: false,
      };
    }

    // ============================================================
    // HEIGHTMAP SETUP
    // ============================================================
    // Resolution for the heightmap grid (smaller = more precise but slower)
    // We use the GCD of common box sizes or a reasonable default
    const resolution = 50; // mm per cell - adjust based on your typical box sizes
    const gridL = Math.ceil(palletL / resolution);
    const gridW = Math.ceil(palletW / resolution);
    
    // 2D heightmap: heightMap[i][j] = current height at grid position (i, j)
    const heightMap = [];
    for (let i = 0; i < gridL; i++) {
      heightMap[i] = [];
      for (let j = 0; j < gridW; j++) {
        heightMap[i][j] = 0;
      }
    }

    // ============================================================
    // HEIGHTMAP HELPER FUNCTIONS
    // ============================================================
    
    /**
     * Get the maximum height under a box footprint
     * This is where the box will sit (respecting gravity)
     */
    function getBaseHeight(posL, posW, boxL, boxW) {
      const startI = Math.floor(posL / resolution);
      const startJ = Math.floor(posW / resolution);
      const endI = Math.min(gridL, Math.ceil((posL + boxL) / resolution));
      const endJ = Math.min(gridW, Math.ceil((posW + boxW) / resolution));
      
      let maxH = 0;
      for (let i = startI; i < endI; i++) {
        for (let j = startJ; j < endJ; j++) {
          if (heightMap[i][j] > maxH) {
            maxH = heightMap[i][j];
          }
        }
      }
      return maxH;
    }

    /**
     * Update heightmap after placing a box
     */
    function setHeight(posL, posW, boxL, boxW, newHeight) {
      const startI = Math.floor(posL / resolution);
      const startJ = Math.floor(posW / resolution);
      const endI = Math.min(gridL, Math.ceil((posL + boxL) / resolution));
      const endJ = Math.min(gridW, Math.ceil((posW + boxW) / resolution));
      
      for (let i = startI; i < endI; i++) {
        for (let j = startJ; j < endJ; j++) {
          heightMap[i][j] = newHeight;
        }
      }
    }

    /**
     * Find the best position for a box using "Bottom-Left" heuristic
     * Prioritizes: 1) lowest base height (gravity), 2) smallest L position, 3) smallest W position
     */
    function findBestPosition(boxL, boxW, boxH) {
      let bestPos = null;
      let bestBaseH = Infinity;
      let bestL = Infinity;
      let bestW = Infinity;

      // Scan all valid positions on the pallet
      // We step by resolution for efficiency, but check exact boundaries
      for (let posL = 0; posL + boxL <= palletL; posL += resolution) {
        for (let posW = 0; posW + boxW <= palletW; posW += resolution) {
          const baseH = getBaseHeight(posL, posW, boxL, boxW);
          
          // Check if box fits within height limit
          if (baseH + boxH > palletH) {
            continue;
          }
          
          // Bottom-Left heuristic: prefer lowest height, then leftmost, then front-most
          const isBetter = 
            baseH < bestBaseH ||
            (baseH === bestBaseH && posL < bestL) ||
            (baseH === bestBaseH && posL === bestL && posW < bestW);
          
          if (isBetter) {
            bestBaseH = baseH;
            bestL = posL;
            bestW = posW;
            bestPos = { posL, posW, baseH };
          }
        }
      }

      return bestPos;
    }

    // ============================================================
    // MAIN PACKING LOOP
    // ============================================================
    const resultGroups = [];
    let totalCartons = 0;
    let totalVolume = 0;
    let maxUsedH = 0;

    // Track used bounding box
    let minUsedL = palletL;
    let maxUsedL = 0;
    let minUsedW = palletW;
    let maxUsedW = 0;

    (groups || []).forEach((g, index) => {
      const l = Number(g.l) || 0;
      const w = Number(g.w) || 0;
      const h = Number(g.h) || 0;
      const qty = Math.max(0, Number(g.qty) || 0);
      const color = g.color || GROUP_COLORS[index % GROUP_COLORS.length];

      const groupPlacements = [];
      let placedInGroup = 0;

      // Skip invalid sizes
      if (l <= 0 || w <= 0 || h <= 0 || qty === 0) {
        resultGroups.push({
          id: g.id,
          name: g.name,
          color,
          l,
          w,
          h,
          qty,
          weight: Number(g.weight) || 0,
          placedQty: 0,
          placements: [],
        });
        return;
      }

      // Generate possible orientations for this box
      const orientations = [
        { l, w, h, label: "upright" },
        { l: w, w: l, h, label: "upright-rotated" },
      ];

      if (allowVerticalFlip) {
        orientations.push(
          { l: w, w: h, h: l, label: "laid-side-l" },
          { l, w: h, h: w, label: "laid-side-w" },
          { l: h, w: l, h: w, label: "laid-h-l" },
          { l: h, w, h: l, label: "laid-h-w" }
        );
      }

      // Filter out orientations that don't fit the pallet at all
      const validOrientations = orientations.filter(o =>
        o.l <= palletL && o.w <= palletW && o.h <= palletH
      );

      if (validOrientations.length === 0) {
        resultGroups.push({
          id: g.id,
          name: g.name,
          color,
          l,
          w,
          h,
          qty,
          weight: Number(g.weight) || 0,
          placedQty: 0,
          placements: [],
        });
        return;
      }

      // Place each box in this group
      for (let i = 0; i < qty; i++) {
        // Try each orientation and pick the best position
        let bestPos = null;
        let bestOrientation = null;
        let bestBaseH = Infinity;

        validOrientations.forEach(orientation => {
          const pos = findBestPosition(orientation.l, orientation.w, orientation.h);
          if (pos && pos.baseH < bestBaseH) {
            bestPos = pos;
            bestOrientation = orientation;
            bestBaseH = pos.baseH;
          }
        });

        if (!bestPos || !bestOrientation) {
          // No valid position found - pallet is full
          break;
        }

        const { posL, posW, baseH } = bestPos;
        const { l: boxL, w: boxW, h: boxH } = bestOrientation;
        const topH = baseH + boxH;

        // Update heightmap
        setHeight(posL, posW, boxL, boxW, topH);

        // Calculate world coordinates (centered around origin)
        const worldX = posL + boxL / 2 - palletL / 2;
        const worldZ = posW + boxW / 2 - palletW / 2;
        const worldY = baseH + boxH / 2 + 100; // +100 for pallet base offset

        // Determine layer index (approximate, for display purposes)
        const layerIndex = Math.floor(baseH / Math.max(boxH, 1));

        groupPlacements.push({
          x: worldX,
          y: worldY,
          z: worldZ,
          l: boxL,
          w: boxW,
          h: boxH,
          groupId: g.id,
          color,
          layerIndex,
          indexInGroup: placedInGroup,
          orientation: bestOrientation.label,
          // Store local coords for debugging
          localL: posL,
          localW: posW,
          localH: baseH,
        });

        placedInGroup++;
        totalCartons++;
        totalVolume += boxL * boxW * boxH;

        // Update bounding box tracking
        minUsedL = Math.min(minUsedL, posL);
        maxUsedL = Math.max(maxUsedL, posL + boxL);
        minUsedW = Math.min(minUsedW, posW);
        maxUsedW = Math.max(maxUsedW, posW + boxW);
        maxUsedH = Math.max(maxUsedH, topH);
      }

      resultGroups.push({
        id: g.id,
        name: g.name,
        color,
        l,
        w,
        h,
        qty,
        weight: Number(g.weight) || 0,
        placedQty: placedInGroup,
        placements: groupPlacements,
      });
    });

    // Calculate final metrics
    const usedL = totalCartons > 0 && maxUsedL > minUsedL ? maxUsedL - minUsedL : 0;
    const usedW = totalCartons > 0 && maxUsedW > minUsedW ? maxUsedW - minUsedW : 0;
    const usedH = totalCartons > 0 ? maxUsedH : 0;

    // Estimate total layers (for display) - this is approximate for mixed sizes
    const allHeights = [];
    resultGroups.forEach(g => {
      g.placements.forEach(p => {
        const baseH = p.localH || 0;
        if (!allHeights.includes(baseH)) {
          allHeights.push(baseH);
        }
      });
    });
    const totalLayers = allHeights.length || 0;

    return {
      multi: true,
      palletL,
      palletW,
      palletH,
      totalCartons,
      totalLayers,
      totalVolume,
      usedL,
      usedW,
      usedH,
      maxHeight: maxUsedH,
      groups: resultGroups,
      palletSwapped: false,
    };
  };
})();