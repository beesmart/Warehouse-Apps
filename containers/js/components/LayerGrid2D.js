// js/components/LayerGrid2D.js
// 2D Pallet Layer Visualization Component

window.CartonApp = window.CartonApp || {};
window.CartonApp.Components = window.CartonApp.Components || {};
window.CartonApp.Constants = window.CartonApp.Constants || {};

const DIMENSION_COLORS = window.CartonApp.Constants.DIMENSION_COLORS || {
  L: "#ef4444", // red
  W: "#3b82f6", // blue
  H: "#10b981", // green
};

// Reuse helper functions if available
const getVisibleLabels =
  window.CartonApp.Utils?.getVisibleLabels ||
  function (pattern = "") {
    const ORIENTATION_LABELS = window.CartonApp.Constants.ORIENTATION_LABELS || {
      upright: { primary: "L", secondary: "W" },
      "upright-rotated": { primary: "W", secondary: "L" },
      "laid-side-l": { primary: "W", secondary: "H" },
      "laid-side-w": { primary: "L", secondary: "H" },
      "laid-h-l": { primary: "L", secondary: "H" },
      "laid-h-w": { primary: "H", secondary: "W" },
      mixed: { primary: "L", secondary: "W" },
    };
    const base = pattern.replace("mixed-", "");
    return ORIENTATION_LABELS[base] || ORIENTATION_LABELS.upright;
  };

const getRowLabels =
  window.CartonApp.Utils?.getRowLabels ||
  function (pattern, rotated) {
    const labels = getVisibleLabels(pattern);
    if (pattern.startsWith("mixed") && rotated) {
      return { primary: labels.secondary, secondary: labels.primary };
    }
    return labels;
  };

// ---------------------------------------------
// LayerGrid2D React Component
// ---------------------------------------------
window.CartonApp.Components.LayerGrid2D = function ({
  spaceL,
  spaceW,
  boxL,
  boxW,
  boxH,
  countL,
  countW,
  usedL,
  usedW,
  patternRows,
  pattern,
  activeCartons,
  multiTile, // multi-group packing result (or null)
}) {
  const [currentLayer, setCurrentLayer] = React.useState(0);

  // Check if we're in multi-carton mode
  const isMulti = !!multiTile && !!multiTile.multi && multiTile.totalCartons > 0;

  // 🧩 Prevent invalid render states when pallet dimensions are empty or invalid
  // For multi-mode, we can be more lenient since we have placement data
  if (!isMulti) {
    if (
      !Number.isFinite(spaceL) ||
      !Number.isFinite(spaceW) ||
      !Number.isFinite(boxL) ||
      !Number.isFinite(boxW) ||
      !Number.isFinite(countL) ||
      !Number.isFinite(countW) ||
      countL <= 0 ||
      countW <= 0
    ) {
      return React.createElement(
        "div",
        { className: "text-sm text-gray-500 italic p-2" },
        "Awaiting valid pallet dimensions..."
      );
    }
  }

  // If pallet orientation was auto-swapped by algorithm, flip L/W for display
  const palletSwapped = window.CartonApp?.lastTile?.palletSwapped || false;
  const drawL = palletSwapped ? spaceW : spaceL;
  const drawW = palletSwapped ? spaceL : spaceW;

  const SVG_W = 520;
  const SVG_H = 320;
  const pad = 6;

  // Basic guard – if invalid dimensions, don't try to draw complicated stuff
  if (!Number.isFinite(drawL) || !Number.isFinite(drawW) || drawL <= 0 || drawW <= 0) {
    return React.createElement(
      "div",
      { className: "p-4 text-xs text-red-600" },
      "Cannot draw layer: invalid pallet dimensions."
    );
  }

  const scale = Math.min(SVG_W / drawL, SVG_H / drawW);
  const outerW = drawL * scale;
  const outerH = drawW * scale;

  // Determine layer capacity
  let perLayerCapacity = 0;

  if (!isMulti) {
    if (patternRows && Array.isArray(patternRows) && patternRows.length > 0) {
      perLayerCapacity = patternRows.reduce(
        (sum, row) => sum + (Number.isFinite(row.countL) ? Math.max(0, Math.floor(row.countL)) : 0),
        0
      );
    } else if (Number.isFinite(countL) && Number.isFinite(countW) && countL > 0 && countW > 0) {
      perLayerCapacity = Math.floor(countL) * Math.floor(countW);
    }
  }

  const cartonsThisLayer =
    Number.isFinite(activeCartons) && activeCartons > 0
      ? Math.min(Math.max(0, Math.floor(activeCartons)), perLayerCapacity || 0)
      : perLayerCapacity;


  let yOffset = 0;
  let placed = 0;

  // -------------------------------
  // Box rendering function (single-carton mode)
  // -------------------------------
  const renderBox = (x, y, width, height, rotated, rowIndex, colIndex) => {

    // If we've already placed enough, skip
    if (placed >= cartonsThisLayer) {
      return null;
    }
    placed++;

    const labels =
      rotated && pattern.startsWith("mixed")
        ? getRowLabels(pattern, rotated)
        : getVisibleLabels(pattern);

    const key = `${rowIndex}-${colIndex}`;

    return React.createElement(
      "g",
      { key: `carton-${key}` },
      // Carton rectangle
      React.createElement("rect", {
        x: x + 1,
        y: y + 1,
        width: width - 2,
        height: height - 2,
        fill: rotated ? "#fef3c7" : "#ffffff",
        stroke: "#111827",
        strokeWidth: 0.8,
        rx: 4,
      }),

      // Length arrow (X-axis)
      React.createElement("line", {
        x1: x + 5,
        y1: y + height / 2,
        x2: x + width - 5,
        y2: y + height / 2,
        stroke: DIMENSION_COLORS[labels.primary],
        strokeWidth: 1,
        markerEnd: "url(#arrowhead)",
      }),
      React.createElement(
        "text",
        {
          x: x + width / 2,
          y: y + height / 2 - 8,
          textAnchor: "middle",
          fontSize: "11",
          fill: DIMENSION_COLORS[labels.primary],
        },
        labels.primary
      ),

      // Width arrow (Y-axis)
      React.createElement("line", {
        x1: x + width / 2,
        y1: y + 5,
        x2: x + width / 2,
        y2: y + height - 5,
        stroke: DIMENSION_COLORS[labels.secondary],
        strokeWidth: 1,
        markerEnd: "url(#arrowhead)",
      }),
      React.createElement(
        "text",
        {
          x: x + width / 2 + 8,
          y: y + height / 2 + 4,
          textAnchor: "start",
          fontSize: "11",
          fill: DIMENSION_COLORS[labels.secondary],
        },
        labels.secondary
      )
    );
  };

  // -------------------------------
  // Multi-group box rendering function
  // -------------------------------
  const renderMultiBox = (placement, groupColor, index) => {
    // Use local coordinates (top-left origin, 0 to palletL/W)
    // These were stored in the placement by the packing algorithm
    // localL = position along pallet length (X in 2D)
    // localW = position along pallet width (Y in 2D)
    
    let x2d, y2d;
    
    if (placement.localL !== undefined && placement.localW !== undefined) {
      // Use stored local coordinates directly (preferred method)
      x2d = placement.localL * scale;
      y2d = placement.localW * scale;
    } else {
      // Fallback: convert from centered world coordinates
      // placement.x/z are CENTER of box in world coords (range: -palletL/2 to +palletL/2)
      // We need TOP-LEFT corner in SVG coords (range: 0 to outerW/H)
      const localCenterX = placement.x + drawL / 2;
      const localCenterZ = placement.z + drawW / 2;
      x2d = (localCenterX - placement.l / 2) * scale;
      y2d = (localCenterZ - placement.w / 2) * scale;
    }
    
    const width = placement.l * scale;
    const height = placement.w * scale;

    return React.createElement(
      "g",
      { key: `multi-carton-${index}` },
      // Carton rectangle with group color
      React.createElement("rect", {
        x: x2d + 1,
        y: y2d + 1,
        width: width - 2,
        height: height - 2,
        fill: groupColor,
        fillOpacity: 0.7,
        stroke: "#111827",
        strokeWidth: 0.8,
        rx: 4,
      })
    );
  };

  // -------------------------------
  // Organize placements into layers and get current layer
  // -------------------------------
  const getLayerPlacements = () => {
    if (!isMulti || !multiTile.groups) return { placements: [], totalLayers: 1, layerHeights: [] };

    // Collect all placements with their base heights
    const allPlacementsWithHeight = [];

    multiTile.groups.forEach((group) => {
      if (!group.placements || !group.placements.length) return;

      group.placements.forEach((placement, idx) => {
        const baseH = placement.localH !== undefined ? placement.localH : 0;
        allPlacementsWithHeight.push({
          placement,
          color: group.color,
          key: `${group.id}-${idx}`,
          baseH
        });
      });
    });

    if (allPlacementsWithHeight.length === 0) {
      return { placements: [], totalLayers: 1, layerHeights: [] };
    }

    // Sort by base height
    allPlacementsWithHeight.sort((a, b) => a.baseH - b.baseH);

    // Group into layers (placements with similar base heights)
    const layers = [];
    const layerHeights = [];
    const tolerance = 5; // 5mm tolerance for grouping into same layer

    allPlacementsWithHeight.forEach((item) => {
      // Find if this belongs to an existing layer
      let addedToLayer = false;
      for (let i = 0; i < layers.length; i++) {
        if (Math.abs(item.baseH - layerHeights[i]) <= tolerance) {
          layers[i].push(item);
          addedToLayer = true;
          break;
        }
      }

      // Create new layer if needed
      if (!addedToLayer) {
        layers.push([item]);
        layerHeights.push(item.baseH);
      }
    });

    // Get placements for current layer (with bounds checking)
    const safeLayer = Math.max(0, Math.min(currentLayer, layers.length - 1));
    const placements = layers[safeLayer] || [];

    return {
      placements,
      totalLayers: layers.length,
      layerHeights,
      currentLayerHeight: layerHeights[safeLayer]
    };
  };

  const layerData = isMulti ? getLayerPlacements() : { placements: [], totalLayers: 1 };

  // Reset to layer 0 if current layer exceeds available layers
  React.useEffect(() => {
    if (isMulti && currentLayer >= layerData.totalLayers) {
      setCurrentLayer(0);
    }
  }, [isMulti, layerData.totalLayers, currentLayer]);

  // -------------------------------
  // Build <svg> and legend
  // -------------------------------
  return React.createElement(
    "div",
    { className: "relative" },
    React.createElement(
      "svg",
      {
        width: SVG_W + pad * 2,
        height: SVG_H + pad * 2,
        className: "bg-gray-50 rounded-xl",
      },
      // Arrow marker
      React.createElement(
        "defs",
        null,
        React.createElement(
          "marker",
          {
            id: "arrowhead",
            markerWidth: "10",
            markerHeight: "7",
            refX: "10",
            refY: "3.5",
            orient: "auto",
          },
          React.createElement("polygon", {
            points: "0 0, 10 3.5, 0 7",
            fill: "#111827",
          })
        )
      ),

      // Pallet outline
      React.createElement(
        "g",
        {
          transform: `translate(${pad + (SVG_W - outerW) / 2}, ${
            pad + (SVG_H - outerH) / 2
          })`,
        },
        React.createElement("rect", {
          x: 0,
          y: 0,
          width: outerW,
          height: outerH,
          fill: "none",
          stroke: "#9ca3af",
          strokeDasharray: "6 6",
        }),

        // Draw cartons - either multi-group or single pattern
        isMulti
          ? // Multi-group rendering - show current layer
            layerData.placements.map(({ placement, color, key }) =>
              renderMultiBox(placement, color, key)
            )
          : // Single-carton pattern rendering
            patternRows && Array.isArray(patternRows) && patternRows.length > 0
            ? patternRows.flatMap((row, rowIndex) => {
                const { rotated, countL, boxL: rowBoxL, boxW: rowBoxW } = row || {};

                const safeRowCountL = Math.max(
                  0,
                  Number.isFinite(countL) ? Math.floor(countL) : 0
                );

                // Skip invalid rows
                if (
                  !Number.isFinite(countL) ||
                  !Number.isFinite(rowBoxL) ||
                  !Number.isFinite(rowBoxW) ||
                  countL <= 0
                ) {
                  return [];
                }

                const y = yOffset * scale;
                yOffset += rowBoxW;

                return Array.from({ length: safeRowCountL }).map((_, i) => {
                  const x = i * rowBoxL * scale;
                  return renderBox(
                    x,
                    y,
                    rowBoxL * scale,
                    rowBoxW * scale,
                    rotated,
                    rowIndex,
                    i
                  );
                });
              })
            : (Number.isFinite(countL) && Number.isFinite(countW) && countL > 0 && countW > 0
                ? Array.from({ length: Math.floor(countL) }).flatMap((_, i) =>
                    Array.from({ length: Math.floor(countW) }).map((_, j) => {
                      const x = i * boxL * scale;
                      const y = j * boxW * scale;
                      return renderBox(x, y, boxL * scale, boxW * scale, false, i, j);
                    })
                  )
                : []
              )
      ),
    ),

    // Legend - show dimension colors for single-carton, group colors for multi-carton
    React.createElement(
      "div",
      { className: "flex justify-center gap-4 mt-2 text-xs text-gray-700" },
      isMulti && multiTile && Array.isArray(multiTile.groups)
        ? // Multi-group legend
          multiTile.groups.map((group) =>
            React.createElement(
              "div",
              { key: group.id, className: "flex items-center gap-1" },
              React.createElement("div", {
                style: { backgroundColor: group.color },
                className: "w-3 h-3 rounded-sm",
              }),
              React.createElement("span", null, group.name || `Group ${group.id}`)
            )
          )
        : // Single-carton dimension legend
          Object.entries(DIMENSION_COLORS).map(([label, color]) =>
            React.createElement(
              "div",
              { key: label, className: "flex items-center gap-1" },
              React.createElement("div", {
                style: { backgroundColor: color },
                className: "w-3 h-3 rounded-sm",
              }),
              React.createElement("span", null, `${label} dimension`)
            )
          )
    ),

    // Multi-carton layer navigation
    isMulti &&
      React.createElement(
        "div",
        {
          className: "flex items-center justify-center gap-3 mt-2 text-sm",
        },
        React.createElement(
          "button",
          {
            onClick: () => setCurrentLayer((prev) => Math.max(0, prev - 1)),
            disabled: currentLayer === 0,
            className: `px-3 py-1 rounded-lg transition-colors ${
              currentLayer === 0
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`,
          },
          "← Previous"
        ),
        React.createElement(
          "span",
          { className: "text-gray-700 font-medium" },
          `Layer ${currentLayer + 1} of ${layerData.totalLayers}`,
          layerData.currentLayerHeight !== undefined &&
            React.createElement(
              "span",
              { className: "text-xs text-gray-500 ml-1" },
              `(${layerData.currentLayerHeight.toFixed(0)}mm)`
            )
        ),
        React.createElement(
          "button",
          {
            onClick: () =>
              setCurrentLayer((prev) => Math.min(layerData.totalLayers - 1, prev + 1)),
            disabled: currentLayer >= layerData.totalLayers - 1,
            className: `px-3 py-1 rounded-lg transition-colors ${
              currentLayer >= layerData.totalLayers - 1
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`,
          },
          "Next →"
        )
      ),

    // ✅ Visual note if swapped
    palletSwapped &&
      React.createElement(
        "div",
        {
          className:
            "absolute bottom-0 left-0 right-0 text-center text-[10px] text-gray-500 italic mt-1",
        },
        "Note: Pallet L/W auto-swapped for optimal fit"
      )
  );
};