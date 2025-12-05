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
  boxPositions,
  pattern,
}) {

    // 🧩 Prevent invalid render states when pallet dimensions are empty or invalid
  // Allow boxPositions to bypass countL/countW validation since pinwheel doesn't use them
  const hasBoxPositions = boxPositions && Array.isArray(boxPositions) && boxPositions.length > 0;
  if (
    !Number.isFinite(spaceL) ||
    !Number.isFinite(spaceW) ||
    !Number.isFinite(boxL) ||
    !Number.isFinite(boxW) ||
    (!hasBoxPositions && (
      !Number.isFinite(countL) ||
      !Number.isFinite(countW) ||
      countL <= 0 ||
      countW <= 0
    ))
  ) {
    return React.createElement(
      "div",
      { className: "text-sm text-gray-500 italic p-2" },
      "Awaiting valid pallet dimensions..."
    );
  }

  // If pallet orientation was auto-swapped by algorithm, flip L/W for display
  const palletSwapped = window.CartonApp?.lastTile?.palletSwapped || false;
  const drawL = palletSwapped ? spaceW : spaceL;
  const drawW = palletSwapped ? spaceL : spaceW;

  const SVG_W = 520;
  const SVG_H = 320;
  const pad = 6;
  const scale = Math.min(SVG_W / drawL, SVG_H / drawW);
  const outerW = drawL * scale;
  const outerH = drawW * scale;

  let yOffset = 0;

  // -------------------------------
  // Box rendering function
  // -------------------------------
  const renderBox = (x, y, width, height, rotated, rowIndex, colIndex) => {
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

        // Draw cartons (pinwheel, patterned rows, or uniform grid)
        hasBoxPositions
          ? boxPositions.map((pos, idx) => {
              const x = pos.x * scale;
              const y = pos.z * scale;
              const width = pos.l * scale;
              const height = pos.w * scale;
              return renderBox(x, y, width, height, pos.rotated, 0, idx);
            })
          : patternRows && Array.isArray(patternRows) && patternRows.length > 0
            ? patternRows.flatMap((row, rowIndex) => {
                const { rotated, countL, boxL: rowBoxL, boxW: rowBoxW } = row || {};

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

                return Array.from({ length: Math.max(0, Math.floor(countL)) }).map((_, i) => {
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

    // Legend
    React.createElement(
      "div",
      { className: "flex justify-center gap-4 mt-2 text-xs text-gray-700" },
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
