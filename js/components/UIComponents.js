// js/components/UIComponents.js
// Reusable UI Components

window.CartonApp = window.CartonApp || {};
window.CartonApp.Components = window.CartonApp.Components || {};

// Input Section Component
window.CartonApp.Components.InputSection = function({ title, fields, onChange, footer }) {
  return React.createElement('section', { 
    className: 'p-4 border rounded-2xl shadow-sm bg-white' 
  },
    React.createElement('h3', { className: 'font-semibold mb-2' }, title),
    ...fields.map(([key, label, value]) =>
      React.createElement('label', {
        key: key,
        className: 'block text-sm my-1'
      },
        label,
        React.createElement('input', {
          type: 'number',
          min: 0,
          step: key === 'weight' || key === 'cartonGrossMax' ? 0.01 : 1,
          value: value,
          onChange: (e) => onChange(key, e.target.value),
          className: 'border rounded-lg px-2 py-1 ml-2 w-28'
        })
      )
    ),
    footer && React.createElement('div', {
      className: 'mt-2 text-sm text-gray-600'
    }, footer)
  );
};

// Metric Card Component
window.CartonApp.Components.MetricCard = function({ 
  title, subtitle, value, unit, footer, error = false 
}) {
  return React.createElement('div', {
    className: 'p-4 border rounded-2xl shadow-sm bg-white'
  },
    React.createElement('h4', { className: 'font-semibold mb-1' }, title),
    subtitle && React.createElement('div', {
      className: 'text-sm text-gray-600 mb-2'
    }, subtitle),
    React.createElement('div', { className: 'text-xl font-bold' },
      `${value} ${unit}`
    ),
    footer && React.createElement('div', {
      className: `text-sm ${error ? 'text-red-600 font-semibold' : 'text-gray-600'}`
    }, footer)
  );
};

// Pallet Size Selector Component
window.CartonApp.Components.PalletSizeSelector = function({ limits, setLimits }) {
  const { PALLET_SIZES } = window.CartonApp.Constants;
  const { handleNumberInput } = window.CartonApp.Utils;
  
  return React.createElement(
    'section',
    { className: 'p-4 border rounded-2xl shadow-sm bg-white' },
    
    React.createElement('h3', { className: 'font-semibold mb-2' }, 'Containers'),

    // Preset dropdown
    React.createElement(
      'label',
      { className: 'block text-sm my-1' },
      'Preset size (L x W x H):',
      React.createElement(
        'select',
        {
          className: 'border rounded-lg px-2 py-1 ml-2 w-60',
          onChange: (e) => {
            const selected = PALLET_SIZES.find(p => p.label === e.target.value);
            if (selected && selected.L && selected.W && selected.H) {
              setLimits({
                ...limits,
                palletL: selected.L,
                palletW: selected.W,
                palletH: selected.H,
                palletGrossMax: selected.WeightLimit || limits.palletGrossMax
              });
            }
          },
          value:
            PALLET_SIZES.find(
              p =>
                p.L === limits.palletL &&
                p.W === limits.palletW &&
                p.H === limits.palletH
            )?.label || 'Custom size'
        },
        ...PALLET_SIZES.map(p =>
          React.createElement('option', { key: p.label, value: p.label }, p.label)
        )
      )
    ),

    // Manual inputs
    ...[
      ['palletL', 'Length (mm)', limits.palletL],
      ['palletW', 'Width (mm)', limits.palletW],
      ['palletH', 'Usable height (mm)', limits.palletH],
      ['cartonGrossMax', 'Max carton gross (kg)', limits.cartonGrossMax],
      ['palletGrossMax', 'Max pallet gross (kg)', limits.palletGrossMax],

    ].map(([key, label, value]) =>
      React.createElement(
        'label',
        { key, className: 'block text-sm my-1' },
        label,
        React.createElement('input', {
          type: 'number',
          min: 0,
          step: key.includes('GrossMax') ? 0.01 : 1,
          value: value ?? '',
          onChange: (e) => handleNumberInput(setLimits, limits, key, e.target.value),
          className: 'border rounded-lg px-2 py-1 ml-2 w-32'
        })
      )
    )
  );
};


// Optimization Details Component
window.CartonApp.Components.OptimizationDetails = function({ palletTile, limits, palletLayers, cartonsPerPallet, carton }) {
  const layoutType = palletTile.pattern?.startsWith("mixed")
    ? "Mixed (alternating rows)"
    : "Uniform (consistent rows)";

  const spaceEfficiency =
    limits.palletL && limits.palletW
      ? ((palletTile.usedL * palletTile.usedW) /
          (limits.palletL * limits.palletW) *
          100
        ).toFixed(1)
      : "0";

  return React.createElement(
    "section",
    { className: "p-4 border rounded-2xl shadow-sm bg-white" },
    React.createElement("h4", { className: "font-semibold mb-2" }, "Optimization Details"),
    React.createElement(
      "div",
      { className: "text-sm" },
      React.createElement("h5", { className: "font-medium text-gray-700 mb-1" }, "Container Configuration"),
      React.createElement(
        "ul",
        { className: "list-disc text-gray-600 pl-5 space-y-0.5" },
        React.createElement("li", null, `Pattern: ${palletTile.pattern}`),
        React.createElement(
          "li",
          null,
          "Layout type: ",
          React.createElement(
            "span",
            {
              className: palletTile.pattern?.startsWith("mixed")
                ? "text-blue-600 font-medium"
                : "text-gray-800 font-medium",
            },
            layoutType
          )
        ),
        React.createElement("li", null, `Cartons per layer: ${palletTile.perLayer}`),
        React.createElement("li", null, `Pallet orientation: ${palletTile.palletSwapped ? "Swapped (1200×1000 used)" : "Original (1000×1200)"}`),
        React.createElement("li", null, `Space efficiency: ${spaceEfficiency}%`),
        React.createElement("li", null, `Vertical layers: ${palletLayers}`),
        React.createElement("li", null, `Stack height: ${palletLayers * palletTile.boxH} mm`),
        React.createElement("li", null, `Total inners on pallet: ${cartonsPerPallet * (carton.innersPerCarton || 0)}`)
      )
    )
  );
};

// Notes & Tips Component
window.CartonApp.Components.NotesAndTips = function() {
  return React.createElement(
    "section",
    { className: "p-4 border rounded-2xl shadow-sm bg-yellow-50" },
    React.createElement("h4", { className: "font-semibold mb-2" }, "Notes & Tips"),
    React.createElement(
      "ul",
      { className: "list-disc pl-5 text-sm text-gray-700 space-y-1" },
      React.createElement("li", null, "3D view shows actual carton stacking on pallet – click and drag to rotate view."),
      React.createElement("li", null, "Toggle between 2D and 3D views using the buttons above the visualization."),
      React.createElement("li", null, "Automatically tests all orientations based on your settings."),
      React.createElement("li", null, "Yellow boxes in 2D view indicate rotated cartons (90° rotation)."),
      React.createElement("li", null, "All calculations use integer tiling (floor function)."),
      React.createElement("li", null, "Red warnings indicate weight limit violations.")
    )
  );
};
