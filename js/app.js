// js/App.js
// Main Application Component

window.CartonApp = window.CartonApp || {};

window.CartonApp.MainApp = function () {
  const { useState, useMemo } = React;
  const { DEFAULT_VALUES, PALLET_SIZES, GROUP_COLORS } = window.CartonApp.Constants;
  const { handleNumberInput, numberFmt } = window.CartonApp.Utils;
  const { bestTile, packGroups } = window.CartonApp.Algorithms;
  const {
    InputSection,
    MetricCard,
    PalletSizeSelector,
    OptimizationDetails,
    NotesAndTips,
    PalletView3D,
  } = window.CartonApp.Components;

  // -------------------------------------------------
  // STATE
  // -------------------------------------------------
  const [carton, setCarton] = useState({
    ...DEFAULT_VALUES.carton,
    weight: 10.0,
    innersPerCarton: DEFAULT_VALUES.carton.innersPerCarton || 0,
  });

  const [cartonGroups, setCartonGroups] = useState([
    {
      id: Date.now(),
      name: "Group 1",
      l: 300,
      w: 300,
      h: 200,
      qty: 10,
      color: "#4a9eff",
    },
  ]);

  const [limits, setLimits] = useState(DEFAULT_VALUES.limits);
  const [allowVerticalFlip, setAllowVerticalFlip] = useState(true);

  const multiMode =
    Array.isArray(cartonGroups) &&
    cartonGroups.some((g) => (Number(g.qty) || 0) > 0);

  // -------------------------------------------------
  // COMPUTATIONS
  // -------------------------------------------------
  const cartonWeight = carton.weight || 0;
  const overweight =
    limits.cartonGrossMax && cartonWeight > limits.cartonGrossMax;

  const palletTile = useMemo(
    () =>
      bestTile(
        carton.l,
        carton.w,
        carton.h,
        limits.palletL,
        limits.palletW,
        limits.palletH,
        allowVerticalFlip
      ),
    [carton, limits, allowVerticalFlip]
  );

  const multiPack = useMemo(
    () =>
      multiMode
        ? packGroups(cartonGroups, limits, allowVerticalFlip)
        : null,
    [multiMode, cartonGroups, limits, allowVerticalFlip]
  );

  const isMultiActive = !!multiPack && multiPack.totalCartons > 0;

  // Decide which packing drives the visuals & metrics
  const drivingTile = isMultiActive ? multiPack : palletTile;

  // Expose current tile globally for 2D view awareness
  window.CartonApp.lastTile = drivingTile;

  const singleLayers = palletTile.layers || 0;
  const singleCartonsPerPallet = palletTile.perLayer * singleLayers;

  let palletLayers = isMultiActive ? multiPack.totalLayers || 0 : singleLayers;
  let cartonsPerPallet = isMultiActive
    ? multiPack.totalCartons || 0
    : singleCartonsPerPallet;

  let effectiveCartons = cartonsPerPallet;
  let desiredTooHigh = false;

  if (!isMultiActive) {
    const desired = Number(limits.desiredCartons);
    if (Number.isFinite(desired) && desired > 0) {
      if (desired > cartonsPerPallet) {
        effectiveCartons = cartonsPerPallet;
        desiredTooHigh = true;
      } else {
        effectiveCartons = desired;
      }
    }
  }

  const totalInnersPerPallet =
    effectiveCartons * (carton.innersPerCarton || 0);

  const palletWeight =
    effectiveCartons * cartonWeight;

  const palletOverweight =
    limits.palletGrossMax && palletWeight > limits.palletGrossMax;

  // -------------------------------------------------
  // GROUP HANDLERS
  // -------------------------------------------------
  function addGroup() {
    const newIndex = cartonGroups.length;
    setCartonGroups([
      ...cartonGroups,
      {
        id: Date.now() + newIndex,
        name: `Group ${newIndex + 1}`,
        l: 300,
        w: 300,
        h: 200,
        qty: 10,
        color: GROUP_COLORS[newIndex % GROUP_COLORS.length],
      },
    ]);
  }

  function updateGroup(id, field, value) {
    setCartonGroups((groups) =>
      groups.map((g) =>
        g.id === id ? { ...g, [field]: field === "name" ? value : Number(value) } : g
      )
    );
  }

  function removeGroup(id) {
    setCartonGroups((groups) => groups.filter((g) => g.id !== id));
  }

  // -------------------------------------------------
  // RENDER
  // -------------------------------------------------
  return React.createElement(
    "div",
    { className: "p-6 space-y-6" },
    // Header
    React.createElement(
      "header",
      { className: "" },
      React.createElement(
        "h1",
        { className: "text-2xl font-bold pb-2" },
        "Carton & Pallet Planner"
      ),
      React.createElement(
        "div",
        { className: "text-md text-blue-600" },
        "All dimensions in ",
        React.createElement("b", {}, "mm"),
        " and weights in ",
        React.createElement("b", {}, "kg"),
        "."
      )
    ),

    // Main Layout
    React.createElement(
      "div",
      { className: "grid grid-cols-1 lg:grid-cols-3 gap-6" },

      // -----------------------
      // INPUT PANEL
      // -----------------------
      React.createElement(
        "div",
        { className: "lg:col-span-1 space-y-4" },

        // CARTON section
        React.createElement(
          "section",
          { className: "p-4 border rounded-2xl shadow-sm bg-white" },
          React.createElement(
            "h3",
            { className: "font-semibold mb-2" },
            "Carton (external)"
          ),
          ...[
            ["l", "Length (mm)", carton.l, "carton"],
            ["w", "Width (mm)", carton.w, "carton"],
            ["h", "Height (mm)", carton.h, "carton"],
            ["weight", "Weight (kg)", carton.weight, "carton"],
            [
              "innersPerCarton",
              "Inner (products) per carton",
              carton.innersPerCarton || 0,
              "carton",
            ],
            [
              "desiredCartons",
              "Desired cartons per pallet (optional)",
              limits.desiredCartons,
              "limit",
            ],
          ].map(([key, label, value, type]) =>
            React.createElement(
              "label",
              { key, className: "block text-sm my-1" },
              label,
              React.createElement("input", {
                type: "number",
                min: 0,
                value: value ?? "",
                onChange: (e) => {
                  if (type === "carton") {
                    handleNumberInput(
                      setCarton,
                      carton,
                      key,
                      e.target.value
                    );
                  } else {
                    handleNumberInput(
                      setLimits,
                      limits,
                      key,
                      e.target.value
                    );
                  }
                },
                className: "border rounded-lg px-2 py-1 ml-2 w-28",
              })
            )
          ),

          // Overweight warning
          React.createElement(
            "div",
            {
              className: `mt-2 text-sm ${
                overweight ? "text-red-600 font-semibold" : "text-gray-600"
              }`,
            },
            `${cartonWeight.toFixed(2)} kg gross`,
            overweight &&
              React.createElement(
                "span",
                {},
                ` — exceeds ${limits.cartonGrossMax} kg limit!`
              )
          ),

          // Allow flip checkbox
          React.createElement(
            "label",
            { className: "flex items-center space-x-2 mt-3 text-sm" },
            React.createElement("input", {
              type: "checkbox",
              checked: allowVerticalFlip,
              onChange: (e) => setAllowVerticalFlip(e.target.checked),
            }),
            React.createElement(
              "span",
              {},
              "Allow cartons to be laid on their side (vertical flipping)"
            )
          )
        ),

        // ---------------------------
        // MULTIPLE CARTON GROUPS
        // ---------------------------
        React.createElement(
          "section",
          { className: "p-4 border rounded-2xl shadow-sm bg-white space-y-4" },

          React.createElement(
            "div",
            { className: "flex items-center justify-between" },
            React.createElement(
              "h3",
              { className: "font-semibold" },
              "Carton Groups"
            ),
            React.createElement(
              "button",
              {
                className:
                  "px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700",
                onClick: addGroup,
              },
              "+ Add Group"
            )
          ),

          ...cartonGroups.map((g) =>
            React.createElement(
              "div",
              {
                key: g.id,
                className:
                  "p-3 border rounded-xl bg-gray-50 flex flex-col gap-2 relative",
              },

              // Delete button
              React.createElement(
                "button",
                {
                  onClick: () => removeGroup(g.id),
                  className:
                    "absolute top-2 right-2 text-red-600 text-xs hover:underline",
                },
                "Remove"
              ),

              // Group name + colour
              React.createElement(
                "div",
                { className: "flex items-center gap-2" },
                React.createElement("div", {
                  className: "w-4 h-4 rounded-sm border",
                  style: { backgroundColor: g.color },
                }),
                React.createElement("input", {
                  type: "text",
                  value: g.name,
                  onChange: (e) => updateGroup(g.id, "name", e.target.value),
                  className: "border rounded px-2 py-1 text-sm w-40",
                })
              ),

              // Dimensions row
              React.createElement(
                "div",
                { className: "grid grid-cols-3 gap-2" },
                ["l", "w", "h"].map((field) =>
                  React.createElement(
                    "label",
                    { key: field, className: "text-xs text-gray-700" },
                    field.toUpperCase(),
                    React.createElement("input", {
                      type: "number",
                      min: 1,
                      value: g[field],
                      onChange: (e) =>
                        updateGroup(g.id, field, Number(e.target.value)),
                      className: "border rounded px-2 py-1 w-full text-sm",
                    })
                  )
                )
              ),

              // Quantity field
              React.createElement(
                "label",
                { className: "text-xs text-gray-700" },
                "Quantity",
                React.createElement("input", {
                  type: "number",
                  min: 0,
                  value: g.qty,
                  onChange: (e) =>
                    updateGroup(g.id, "qty", Number(e.target.value)),
                  className:
                    "border rounded px-2 py-1 w-32 ml-2 text-sm",
                })
              )
            )
          ),

          React.createElement(
            "p",
            { className: "text-xs text-blue-700 mt-1" },
            "Multi-group packing active when at least one group has quantity > 0. 3D view will show mixed groups."
          )
        ),

        // PALLET size selector
        React.createElement(PalletSizeSelector, {
          limits,
          setLimits,
        }),

        // TOTAL WEIGHT
        React.createElement(
          "div",
          {
            className: `mt-2 text-sm px-4 ${
              palletOverweight
                ? "text-red-600 font-semibold"
                : "text-gray-600"
            }`,
          },
          palletOverweight
            ? `⚠️ Total pallet weight ${palletWeight.toFixed(
                2
              )} kg exceeds ${limits.palletGrossMax} kg limit!`
            : `Total pallet weight: ${palletWeight.toFixed(2)} kg`
        )
      ),

      // -----------------------
      // VISUALIZATION PANEL
      // -----------------------
      React.createElement(
        "div",
        { className: "lg:col-span-2 space-y-4" },

        // 3D / 2D Pallet View
        React.createElement(window.CartonApp.Components.PalletView3D, {
          palletL: limits.palletL,
          palletW: limits.palletW,
          palletH: limits.palletH,
          cartonL: palletTile.boxL,
          cartonW: palletTile.boxW,
          cartonH: palletTile.boxH,
          pattern: palletTile.pattern,
          perLayer: palletTile.perLayer,
          layers: palletLayers,
          patternRows: palletTile.patternRows,
          palletTile,
          cartonWeight,
          effectiveCartons,
          multiTile: isMultiActive ? multiPack : null, // NEW
        }),

        // Flip Info
        React.createElement(
          "div",
          {
            className: `text-s mt-1 pl-1 ${
              allowVerticalFlip ? "text-green-600" : "text-orange-500"
            }`,
          },
          allowVerticalFlip
            ? "All orientations, including side-laying and flat, will be tested."
            : "Only upright and horizontal rotations will be considered (no side or flat flips)."
        ),

        // Metric Cards
        React.createElement(
          "section",
          { className: "grid md:grid-cols-2 gap-4" },

          // Carton card
          React.createElement(MetricCard, {
            title: "Carton",
            subtitle: `${carton.l}×${carton.w}×${carton.h} mm`,
            value: 1,
            unit: "carton",
            footer: `${cartonWeight.toFixed(2)} kg gross ${
              overweight ? "(OVER LIMIT)" : ""
            }`,
          }),

          // Per pallet card
          React.createElement(MetricCard, {
            title: "Per Pallet",
            subtitle: isMultiActive
              ? `Multi-group: ${cartonsPerPallet} cartons across ${palletLayers} layer${
                  palletLayers === 1 ? "" : "s"
                }`
              : `${palletTile.perLayer} cartons/layer × ${palletLayers} layers`,
            value: `${numberFmt(
              effectiveCartons
            )} cartons with ${totalInnersPerPallet}`,
            unit: "inner products",
            footer: `${palletWeight.toFixed(1)} kg total  ${
              palletOverweight ? " ⚠️ OVER LIMIT" : ""
            }`,
            error: palletOverweight,
          })
        ),

        // Optimization summary (currently single-carton-based)
        React.createElement(window.CartonApp.Components.OptimizationDetails, {
          palletTile,
          limits,
          palletLayers: singleLayers,
          cartonsPerPallet: singleCartonsPerPallet,
          carton,
        }),

        // Notes section
        React.createElement(window.CartonApp.Components.NotesAndTips)
      )
    )
  );
};

// -----------------------------------------------
// Initialize App
// -----------------------------------------------
(function initApp() {
  const root = document.getElementById("root");
  if (!root) {
    console.error("❌ Root element #root not found.");
    return;
  }

  console.log("🚀 Mounting React App...");
  ReactDOM.createRoot(root).render(
    React.createElement(window.CartonApp.MainApp)
  );
})();
