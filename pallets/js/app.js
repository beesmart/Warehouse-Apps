// js/App.js
// Main Application Component

window.CartonApp = window.CartonApp || {};

window.CartonApp.MainApp = function () {
  const { useState, useMemo, useEffect } = React;
  const { DEFAULT_VALUES, PALLET_SIZES } = window.CartonApp.Constants;
  const { handleNumberInput, numberFmt, parseUrlParams, updateUrlParams } = window.CartonApp.Utils;
  const { bestTile } = window.CartonApp.Algorithms;
  const {
    InputSection,
    MetricCard,
    PalletSizeSelector,
    OptimizationDetails,
    NotesAndTips,
    PalletView3D,
  } = window.CartonApp.Components;

  // -------------------------------------------------
  // Initialize state from URL params or defaults
  // -------------------------------------------------
  const getInitialState = () => {
    const urlParams = parseUrlParams();

    const cartonInit = urlParams.carton
      ? { ...DEFAULT_VALUES.carton, ...urlParams.carton }
      : { ...DEFAULT_VALUES.carton, weight: 10.0 };

    const limitsInit = urlParams.pallet
      ? {
          ...DEFAULT_VALUES.limits,
          palletL: urlParams.pallet.L,
          palletW: urlParams.pallet.W,
          palletH: urlParams.pallet.H,
        }
      : DEFAULT_VALUES.limits;

    return { cartonInit, limitsInit };
  };

  const { cartonInit, limitsInit } = getInitialState();

  // -------------------------------------------------
  // STATE
  // -------------------------------------------------
  const [carton, setCarton] = useState(cartonInit);
  const [limits, setLimits] = useState(limitsInit);
  const [allowVerticalFlip, setAllowVerticalFlip] = useState(true);

  // -------------------------------------------------
  // Update URL when carton or limits change
  // -------------------------------------------------
  useEffect(() => {
    updateUrlParams(carton, limits);
  }, [carton.l, carton.w, carton.h, limits.palletL, limits.palletW, limits.palletH]);

  // -------------------------------------------------
  // COMPUTATIONS
  // -------------------------------------------------
  const cartonWeight = carton.weight;
  const overweight = cartonWeight > limits.cartonGrossMax;

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

  // Expose current tile globally for 2D view awareness
  window.CartonApp.lastTile = palletTile;

  const palletLayers = palletTile.layers;
  const cartonsPerPallet = palletTile.perLayer * palletLayers;
  const totalInnersPerPallet = cartonsPerPallet * (carton.innersPerCarton || 0);
  const palletWeight = cartonsPerPallet * cartonWeight;
  const palletOverweight = limits.palletGrossMax && palletWeight > limits.palletGrossMax;

  // -------------------------------------------------
  // RENDER
  // -------------------------------------------------
  return React.createElement(
    "div",
    { className: "min-h-screen" },

    // Navigation Bar
    React.createElement(
      "nav",
      { className: "bg-gray-700 text-white" },
      React.createElement(
        "div",
        { className: "mx-auto px-4 sm:px-6 lg:px-8" },
        React.createElement(
          "div",
          { className: "flex items-center justify-between h-14" },
          // Logo / Brand
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            React.createElement(
              "span",
              { className: "font-semibold text-lg" },
              "Carton & Pallet - Planner & Visualizer"
            )
          ),
          // Nav Links
          React.createElement(
            "div",
            { className: "flex items-center gap-2" },
            React.createElement(
              "a",
              {
                href: "https://tools.e-bedding.co.uk/pallets",
                className: "px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-600 transition-colors"
              },
              "Pallets"
            ),
            React.createElement(
              "a",
              {
                href: "https://tools.e-bedding.co.uk/containers",
                className: "px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
              },
              "Containers"
            ),
            // Divider
            React.createElement("div", {
              className: "h-6 w-px bg-gray-500 mr-4"
            }),
            // Report Problem button
            React.createElement(window.CartonApp.Components.ReportProblem)
          )
        )
      )
    ),

    // Main Content
    React.createElement(
      "div",
      { className: "p-6 space-y-6" },
      // Header
      React.createElement(
        "header",
        { className: "" },
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
            ["l", "Length (mm)", carton.l],
            ["w", "Width (mm)", carton.w],
            ["h", "Height (mm)", carton.h],
            ["weight", "Weight (kg)", carton.weight],
            ['innersPerCarton', 'Inner (products) per carton', carton.innersPerCarton || 0],
          ].map(([key, label, value]) =>
            React.createElement(
              "label",
              { key, className: "block text-sm my-1" },
              label,
              React.createElement("input", {
                type: "number",
                min: 0,
                value,
                onChange: (e) =>
                  handleNumberInput(setCarton, carton, key, e.target.value),
                className: "border rounded-lg px-2 py-1 ml-2 w-28",
              })
            )
          ),

          // Overweight warning
          React.createElement(
            "div",
            {
              className: `mt-2 text-sm ${
                overweight
                  ? "text-red-600 font-semibold"
                  : "text-gray-600"
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

        // PALLET size selector
        React.createElement(PalletSizeSelector, {
          limits,
          setLimits,
        }),

        // TOTAL WEIGHT
        React.createElement(
          "div",
          { 
            className: `mt-2 text-sm px-4 ${palletOverweight ? "text-red-600 font-semibold" : "text-gray-600"}`
          },
          palletOverweight 
            ? `⚠️ Total pallet weight ${palletWeight.toFixed(2)} kg exceeds ${limits.palletGrossMax} kg limit!`
            : `Total pallet weight: ${palletWeight.toFixed(2)} kg`
        )
      ),

      // -----------------------
      // VISUALIZATION PANEL
      // -----------------------
      React.createElement(
        "div",
        { className: "lg:col-span-2 space-y-4" },

        // 3D Pallet View
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
            error: overweight,
          }),

          // Per pallet card
          React.createElement(MetricCard, {
            title: "Per Pallet",
            subtitle: `${palletTile.perLayer} cartons/layer × ${palletLayers} layers`,
            value: `${numberFmt(cartonsPerPallet)} cartons with  ${totalInnersPerPallet}`,
            unit: "inner products",
            footer: `${palletWeight.toFixed(1)} kg total  ${
              palletOverweight ? " ⚠️ OVER LIMIT" : ""
            }`,
            error: palletOverweight,
          })
        ),

        // Optimization summary
        React.createElement(window.CartonApp.Components.OptimizationDetails, {
          palletTile,
          limits,
          palletLayers,
          cartonsPerPallet,
          carton
        }),

        // Notes section
        React.createElement(window.CartonApp.Components.NotesAndTips)
      )
      )
    ) // Close main content div
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
