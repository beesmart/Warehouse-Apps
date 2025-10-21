// js/App.js
// Main Application Component

window.CartonApp = window.CartonApp || {};

window.CartonApp.MainApp = function() {
      console.log("✅ MainApp rendering");
  const { useState, useMemo } = React;
  const { DEFAULT_VALUES, PALLET_SIZES } = window.CartonApp.Constants;
  const { handleNumberInput, numberFmt } = window.CartonApp.Utils;
  const { bestTile } = window.CartonApp.Algorithms;
  const { 
    InputSection, 
    MetricCard, 
    PalletSizeSelector,
    OptimizationDetails,
    NotesAndTips,
    PalletView3D 
  } = window.CartonApp.Components;
  
  // State management
  const [product, setProduct] = useState(DEFAULT_VALUES.product);
  const [carton, setCarton] = useState(DEFAULT_VALUES.carton);
  const [limits, setLimits] = useState(DEFAULT_VALUES.limits);
  const [allowVerticalFlip, setAllowVerticalFlip] = useState(true);
  
  // Calculations
  const unitsPerCarton = useMemo(() => {
    if (product.l <= 0 || product.w <= 0 || product.h <= 0 || 
        carton.l <= 0 || carton.w <= 0 || carton.h <= 0) {
      return 0;
    }
    return Math.floor(carton.l / product.l) *
           Math.floor(carton.w / product.w) *
           Math.floor(carton.h / product.h);
  }, [carton, product]);
  
  const cartonWeight = unitsPerCarton * product.weight;
  const overweight = cartonWeight > limits.cartonGrossMax;
  
  const palletTile = useMemo(
    () => bestTile(carton.l, carton.w, carton.h, limits.palletL, limits.palletW, limits.palletH, allowVerticalFlip),
    [carton, limits, allowVerticalFlip]
  );
  
  const palletLayers = palletTile.layers;
  const cartonsPerPallet = palletTile.perLayer * palletLayers;
  const unitsPerPallet = cartonsPerPallet * unitsPerCarton;
  const palletWeight = cartonsPerPallet * cartonWeight;
  
  return React.createElement('div', { className: 'p-6 space-y-6' },
    // Header
    React.createElement('header', { className: 'flex items-center justify-between' },
      React.createElement('h1', { className: 'text-2xl font-bold' }, 'Carton & Pallet Planner'),
      React.createElement('div', { className: 'text-sm text-gray-600' },
        'All dimensions in ',
        React.createElement('b', {}, 'mm'),
        ' and weights in ',
        React.createElement('b', {}, 'kg'),
        '.'
      )
    ),
    
    // Main Grid
    React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-3 gap-6' },
      // Input Panel
      React.createElement('div', { className: 'lg:col-span-1 space-y-4' },
        // Product Section
        React.createElement(InputSection, {
          title: 'Product',
          fields: [
            ['l', 'Length', product.l],
            ['w', 'Width', product.w],
            ['h', 'Height', product.h],
            ['weight', 'Weight (kg)', product.weight],
          ],
          onChange: (key, value) => handleNumberInput(setProduct, product, key, value)
        }),
        
        // Carton Section
        React.createElement('section', { className: 'p-4 border rounded-2xl shadow-sm bg-white' },
          React.createElement('h3', { className: 'font-semibold mb-2' }, 'Carton (external)'),
          ...[
            ['l', 'Length', carton.l],
            ['w', 'Width', carton.w],
            ['h', 'Height', carton.h],
          ].map(([key, label, value]) =>
            React.createElement('label', {
              key: key,
              className: 'block text-sm my-1'
            },
              label,
              React.createElement('input', {
                type: 'number',
                min: 0,
                value: value,
                onChange: (e) => handleNumberInput(setCarton, carton, key, e.target.value),
                className: 'border rounded-lg px-2 py-1 ml-2 w-28'
              })
            )
          ),
          React.createElement('div', {
            className: `mt-2 text-sm ${overweight ? 'text-red-600 font-semibold' : 'text-gray-600'}`
          },
            `${unitsPerCarton} units / carton · ${cartonWeight.toFixed(2)} kg gross`,
            overweight && React.createElement('span', {}, ` — exceeds ${limits.cartonGrossMax} kg limit!`)
          ),
          React.createElement('label', { className: 'flex items-center space-x-2 mt-3 text-sm' },
            React.createElement('input', {
              type: 'checkbox',
              checked: allowVerticalFlip,
              onChange: (e) => setAllowVerticalFlip(e.target.checked)
            }),
            React.createElement('span', {}, 'Allow cartons to be laid on their side (vertical flipping)')
          )
        ),
        
        // Pallet Section with Size Selector
        React.createElement(PalletSizeSelector, {
          limits: limits,
          setLimits: setLimits
        }),
        
        // Total Weight Display
        React.createElement('div', { className: 'mt-2 text-sm text-gray-600 px-4' },
          `Total weight: ${palletWeight.toFixed(2)} kg`
        )
      ),
      
      // Visualization Panel
      React.createElement('div', { className: 'lg:col-span-2 space-y-4' },
        // 3D Pallet View
        React.createElement(PalletView3D, {
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
          palletTile: palletTile,
          cartonWeight: cartonWeight
        }),
        
        // Flip Status Message
        React.createElement('div', {
          className: `text-s mt-1 pl-1 ${allowVerticalFlip ? 'text-green-600' : 'text-orange-500'}`
        },
          allowVerticalFlip
            ? 'All orientations, including side-laying and flat, will be tested.'
            : 'Only upright and horizontal rotations will be considered (no side or flat flips).'
        ),
        
        // Metric Cards
        React.createElement('section', { className: 'grid md:grid-cols-2 gap-4' },
          React.createElement(MetricCard, {
            title: 'Carton',
            subtitle: `${carton.l}×${carton.w}×${carton.h} mm`,
            value: unitsPerCarton,
            unit: 'units',
            footer: `${cartonWeight.toFixed(2)} kg gross ${overweight ? '(OVER LIMIT)' : ''}`,
            error: overweight
          }),
          
          React.createElement(MetricCard, {
            title: 'Per Pallet',
            subtitle: `${palletTile.perLayer} cartons/layer × ${palletLayers} layers`,
            value: numberFmt(cartonsPerPallet),
            unit: 'cartons',
            footer: `${numberFmt(unitsPerPallet)} units · ${palletWeight.toFixed(1)} kg total`
          })
        ),
        
        // Optimization Details
        React.createElement(OptimizationDetails, {
          palletTile: palletTile,
          limits: limits,
          palletLayers: palletLayers
        }),
        
        // Notes and Tips
        React.createElement(NotesAndTips)
      )
    )
  );
};

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  ReactDOM.createRoot(document.getElementById('root')).render(
    React.createElement(window.CartonApp.MainApp)
  );
});