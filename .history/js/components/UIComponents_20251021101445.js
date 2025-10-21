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
  
  return React.createElement('section', {
    className: 'p-4 border rounded-2xl shadow-sm bg-white'
  },
    React.createElement('h3', { className: 'font-semibold mb-2' }, 'Pallet (CHEP)'),
    
    // Preset dropdown
    React.createElement('label', { className: 'block text-sm my-1' },
      'Preset size (L x W x H):',
      React.createElement('select', {
        className: 'border rounded-lg px-2 py-1 ml-2 w-60',
        onChange: (e) => {
          const selected = PALLET_SIZES.find(p => p.label === e.target.value);
          if (selected && selected.L && selected.W && selected.H) {
            setLimits({ ...limits, palletL: selected.L, palletW: selected.W, palletH: selected.H });
          }
        },
        value: PALLET_SIZES.find(
          p => p.L === limits.palletL && p.W === limits.palletW && p.H === limits.palletH
        )?.label || "Custom size"
      },
        ...PALLET_SIZES.map(p =>
          React.createElement('option', { key: p.label, value: p.label }, p.label)
        )
      )
    ),
    
    // Manual inputs
    ...[
      ["palletL", "Length", limits.palletL],
      ["palletW", "Width", limits.palletW],
      ["palletH", "Usable height", limits.palletH],
      ["cartonGrossMax", "Max carton gross (kg)", limits.cartonGrossMax],
    ].map(([key, label, value]) =>
      React.createElement('label', {
        key: key,
        className: 'block text-sm my-1'
      },
        label,
        React.createElement('input', {
          type: 'number',
          min: 0,
          step: key === 'cartonGrossMax' ?