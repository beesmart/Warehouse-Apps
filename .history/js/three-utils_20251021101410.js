// js/algorithms.js
// Core calculation algorithms

window.CartonApp.Algorithms = {
  bestTile: function(boxL, boxW, boxH, spaceL, spaceW, spaceH, allowVerticalFlip = true) {
    // Validate inputs
    if (boxL <= 0 || boxW <= 0 || boxH <= 0 || spaceL <= 0 || spaceW <= 0 || spaceH <= 0) {
      return {
        countL: 0,
        countW: 0,
        layers: 0,
        perLayer: 0,
        total: 0,
        boxL,
        boxW,
        boxH,
        usedL: 0,
        usedW: 0,
        usedH: 0,
        pattern: "none",
        patternRows: null
      };
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
    
    const candidates = [];
    
    // Try uniform patterns
    const fitUniform = (o) => {
      const countL = Math.floor(spaceL / o.l);
      const countW = Math.floor(spaceW / o.w);
      const layers = Math.floor(spaceH / o.h);
      
      if (countL <= 0 || countW <= 0 || layers <= 0) return null;
      
      const perLayer = countL * countW;
      return {
        pattern: o.label,
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
      };
    };
    
    // Try mixed patterns
    const fitMixed = (o) => {
      if (o.l === o.w) return null; // No benefit to mixing if square
      
      const layers = Math.floor(spaceH / o.h);
      if (layers <= 0) return null;
      
      const patternRows = [];
      let yUsed = 0;
      let totalInLayer = 0;
      let remainingW = spaceW;
      let maxUsedL = 0;
      let rowIndex = 0;
      
      while (remainingW >= Math.min(o.l, o.w)) {
        const rotated = rowIndex % 2 === 1;
        const rowL = rotated ? o.w : o.l;
        const rowW = rotated ? o.l : o.w;
        
        if (remainingW < rowW) break;
        
        const cols = Math.floor(spaceL / rowL);
        if (cols === 0) break;
        
        patternRows.push({ rotated, countL: cols, boxL: rowL, boxW: rowW });
        totalInLayer += cols;
        maxUsedL = Math.max(maxUsedL, cols * rowL);
        yUsed += rowW;
        remainingW -= rowW;
        rowIndex++;
      }
      
      if (!patternRows.length) return null;
      
      return {
        pattern: "mixed-" + o.label,
        layers,
        perLayer: totalInLayer,
        total: totalInLayer * layers,
        boxL: o.l,
        boxW: o.w,
        boxH: o.h,
        usedL: maxUsedL,
        usedW: yUsed,
        usedH: layers * o.h,
        patternRows,
      };
    };
    
    // Test all orientations
    orientations.forEach((o) => {
      const uniform = fitUniform(o);
      if (uniform) candidates.push(uniform);
      
      const mixed = fitMixed(o);
      if (mixed) candidates.push(mixed);
    });
    
    // Return best option or empty result
    if (!candidates.length) {
      return {
        countL: 0,
        countW: 0,
        layers: 0,
        perLayer: 0,
        total: 0,
        boxL,
        boxW,
        boxH,
        usedL: 0,
        usedW: 0,
        usedH: 0,
        pattern: "none",
        patternRows: null
      };
    }
    
    // Sort by total cartons, then by per-layer efficiency
    candidates.sort((a, b) => b.total - a.total || b.perLayer - a.perLayer);
    return candidates[0];
  }
};