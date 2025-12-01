// js/App.js
// Main Application Component

window.CartonApp = window.CartonApp || {};

window.CartonApp.MainApp = function () {
  const { useState, useMemo } = React;
  const { DEFAULT_VALUES, PALLET_SIZES, GROUP_COLORS } = window.CartonApp.Constants;
  const { handleNumberInput, numberFmt } = window.CartonApp.Utils;
  const { bestTile, packGroups, packMultipleContainers, recommendContainers } = window.CartonApp.Algorithms;
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
      weight: 10.0,
      color: "#4a9eff",
    },
  ]);

  const [limits, setLimits] = useState(DEFAULT_VALUES.limits);
  const [allowVerticalFlip, setAllowVerticalFlip] = useState(true);

  // -------------------------------------------------
  // MULTI-CONTAINER STATE
  // -------------------------------------------------
  const [containers, setContainers] = useState([
    {
      id: Date.now(),
      type: "20ft Container (6058 × 2438 mm x 2591mm)",
      L: 6058,
      W: 2438,
      H: 2591,
      weightLimit: 28000,
      allowedGroups: [], // Empty array = allow all groups (default behavior)
    },
  ]);
  const [activeContainerIndex, setActiveContainerIndex] = useState(0);
  const [spreadAcrossContainers, setSpreadAcrossContainers] = useState(false);
  const [isRecommending, setIsRecommending] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const multiMode =
    Array.isArray(cartonGroups) &&
    cartonGroups.some((g) => (Number(g.qty) || 0) > 0);

  // Apply wait cursor when processing heavy operations
  React.useEffect(() => {
    if (isProcessing || isRecommending) {
      document.body.style.cursor = 'wait';
      // Apply to all interactive elements
      const style = document.createElement('style');
      style.id = 'processing-cursor-style';
      style.textContent = '* { cursor: wait !important; }';
      document.head.appendChild(style);
    } else {
      document.body.style.cursor = '';
      const style = document.getElementById('processing-cursor-style');
      if (style) style.remove();
    }

    return () => {
      document.body.style.cursor = '';
      const style = document.getElementById('processing-cursor-style');
      if (style) style.remove();
    };
  }, [isProcessing, isRecommending]);

  // -------------------------------------------------
  // COMPUTATIONS
  // -------------------------------------------------
  // Get active container dimensions
  const activeContainer = containers[activeContainerIndex] || containers[0];
  const containerLimits = {
    palletL: activeContainer.L,
    palletW: activeContainer.W,
    palletH: activeContainer.H,
    palletGrossMax: activeContainer.weightLimit,
    cartonGrossMax: limits.cartonGrossMax,
    desiredCartons: limits.desiredCartons,
  };

  const cartonWeight = carton.weight || 0;
  const overweight =
    containerLimits.cartonGrossMax && cartonWeight > containerLimits.cartonGrossMax;

  const palletTile = useMemo(
    () =>
      bestTile(
        carton.l,
        carton.w,
        carton.h,
        containerLimits.palletL,
        containerLimits.palletW,
        containerLimits.palletH,
        allowVerticalFlip
      ),
    [carton, containerLimits.palletL, containerLimits.palletW, containerLimits.palletH, allowVerticalFlip]
  );

  // Multi-container packing: pack groups across all containers
  // NOTE: cartonGroups is intentionally NOT in the dependency array to prevent
  // recalculation on every dimension/quantity/weight change (performance optimization)
  // Recalculation only happens when containers change or user clicks "Recommend Containers"
  const multiContainerPacking = useMemo(
    () =>
      multiMode && containers.length > 0
        ? packMultipleContainers(cartonGroups, containers, allowVerticalFlip, spreadAcrossContainers)
        : null,
    [multiMode, containers, allowVerticalFlip, spreadAcrossContainers]
  );

  // Get packing result for the active container
  const multiPack = multiContainerPacking
    ? multiContainerPacking[activeContainerIndex] || null
    : null;

  // IMPORTANT: In multi-mode, ALWAYS use multiPack (even if empty)
  // This prevents fallback to single-carton bestTile calculations
  const isMultiActive = !!multiPack;

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

  // Calculate weight based on mode
  let palletWeight = 0;
  if (isMultiActive && multiPack && multiPack.groups) {
    // Multi-carton mode: sum up weight from all placed boxes
    palletWeight = multiPack.groups.reduce((total, group) => {
      const groupWeight = Number(group.weight) || 0;
      const placedQty = Number(group.placedQty) || 0;
      return total + (groupWeight * placedQty);
    }, 0);
  } else {
    // Single-carton mode
    palletWeight = effectiveCartons * cartonWeight;
  }

  const palletOverweight =
    containerLimits.palletGrossMax && palletWeight > containerLimits.palletGrossMax;

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
        weight: 10.0,
        color: GROUP_COLORS[newIndex % GROUP_COLORS.length],
      },
    ]);
  }

  function updateGroup(id, field, value) {
    setIsProcessing(true);
    setTimeout(() => {
      setCartonGroups((groups) =>
        groups.map((g) =>
          g.id === id ? { ...g, [field]: field === "name" ? value : Number(value) } : g
        )
      );
      setIsProcessing(false);
    }, 10);
  }

  function removeGroup(id) {
    setCartonGroups((groups) => groups.filter((g) => g.id !== id));
  }

  // -------------------------------------------------
  // CONTAINER HANDLERS
  // -------------------------------------------------
  function addContainer() {
    const newContainer = {
      id: Date.now(),
      type: "20ft Container (6058 × 2438 mm x 2591mm)",
      L: 6058,
      W: 2438,
      H: 2591,
      weightLimit: 28000,
      allowedGroups: [], // Empty array = allow all groups (default behavior)
    };
    setContainers([...containers, newContainer]);
  }

  function updateContainer(index, field, value) {
    setIsProcessing(true);
    setTimeout(() => {
      setContainers((ctrs) =>
        ctrs.map((c, i) => {
          if (i !== index) return c;
          if (field === "type") {
            // When type changes, update all dimensions from preset
            const preset = PALLET_SIZES.find((p) => p.label === value);
            if (preset && preset.L && preset.W && preset.H) {
              return {
                ...c,
                type: value,
                L: preset.L,
                W: preset.W,
                H: preset.H,
                weightLimit: preset.WeightLimit || c.weightLimit,
              };
            }
          }
          return { ...c, [field]: value };
        })
      );
      setIsProcessing(false);
    }, 10);
  }

  function removeContainer(index) {
    if (containers.length <= 1) return; // Keep at least one container
    setIsProcessing(true);
    setTimeout(() => {
      setContainers((ctrs) => ctrs.filter((_, i) => i !== index));
      // Adjust active index if needed
      if (activeContainerIndex >= containers.length - 1) {
        setActiveContainerIndex(Math.max(0, containers.length - 2));
      }
      setIsProcessing(false);
    }, 10);
  }

  function updateContainerGroups(index, selectedGroupIds) {
    setIsProcessing(true);
    setTimeout(() => {
      setContainers((ctrs) =>
        ctrs.map((c, i) =>
          i === index ? { ...c, allowedGroups: selectedGroupIds } : c
        )
      );
      setIsProcessing(false);
    }, 10);
  }

  function handleRecommendContainers() {
    setIsRecommending(true);

    // Use setTimeout to allow UI to update with loading state before heavy computation
    setTimeout(() => {
      const recommended = recommendContainers(cartonGroups, PALLET_SIZES, allowVerticalFlip);
      if (recommended.length > 0) {
        setContainers(recommended);
        setActiveContainerIndex(0);
        setSpreadAcrossContainers(false); // Reset to sequential mode
      }
      setIsRecommending(false);
    }, 50);
  }

  // -------------------------------------------------
  // RENDER
  // -------------------------------------------------
  return React.createElement(
    "div",
    { className: "min-h-screen" },

    // Navigation Bar
    React.createElement(
      "nav",
      { className: "bg-teal-700 text-white" },
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
              "Shipping Container - Planner & Visualizer"
            )
          ),
          // Nav Links
          React.createElement(
            "div",
            { className: "flex items-center gap-1" },
            React.createElement(
              "a",
              {
                href: "https://tools.e-bedding.co.uk/pallets",
                className: "px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
              },
              "Pallets"
            ),
            React.createElement(
              "a",
              {
                href: "https://tools.e-bedding.co.uk/containers",
                className: "px-4 py-2 rounded-lg text-sm font-medium bg-teal-500 hover:bg-teal-600 transition-colors"
              },
              "Containers"
            )
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
          { className: "text-sm text-blue-600" },
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
                  "px-3 py-1 bg-teal-500 text-white rounded-lg text-sm hover:bg-teal-600",
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

              // Quantity and Weight row
              React.createElement(
                "div",
                { className: "grid grid-cols-2 gap-2" },
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
                    className: "border rounded px-2 py-1 w-full text-sm",
                  })
                ),
                React.createElement(
                  "label",
                  { className: "text-xs text-gray-700" },
                  "Weight (kg)",
                  React.createElement("input", {
                    type: "number",
                    min: 0,
                    step: 0.1,
                    value: g.weight || 0,
                    onChange: (e) =>
                      updateGroup(g.id, "weight", Number(e.target.value)),
                    className: "border rounded px-2 py-1 w-full text-sm",
                  })
                )
              )
            )
          ),

          React.createElement(
            "p",
            { className: "text-xs text-blue-700 mt-1" },
            "Multi-group packing active when at least one group has quantity > 0. 3D view will show mixed groups."
          )
        ),

        // ---------------------------
        // CONTAINER CONFIGURATION
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
              "Containers"
            ),
            React.createElement(
              "div",
              { className: "flex gap-2" },
              React.createElement(
                "button",
                {
                  className:
                    "px-3 py-1 bg-teal-500 text-white rounded-lg text-sm hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2",
                  onClick: handleRecommendContainers,
                  disabled: isRecommending,
                },
                isRecommending && React.createElement(
                  "svg",
                  {
                    className: "animate-spin h-4 w-4",
                    xmlns: "http://www.w3.org/2000/svg",
                    fill: "none",
                    viewBox: "0 0 24 24"
                  },
                  React.createElement("circle", {
                    className: "opacity-25",
                    cx: "12",
                    cy: "12",
                    r: "10",
                    stroke: "currentColor",
                    strokeWidth: "4"
                  }),
                  React.createElement("path", {
                    className: "opacity-75",
                    fill: "currentColor",
                    d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  })
                ),
                isRecommending ? "Calculating..." : "Recommend Containers"
              ),
              React.createElement(
                "button",
                {
                  className:
                    "px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-700",
                  onClick: addContainer,
                },
                "+ Add Container"
              )
            )
          ),

          ...containers.map((container, index) =>
            React.createElement(
              "div",
              {
                key: container.id,
                className: `p-3 border rounded-xl ${
                  index === activeContainerIndex
                    ? "bg-blue-50 border-blue-400"
                    : "bg-gray-50"
                } flex flex-col gap-2 relative`,
              },

              // Delete button (only if more than 1 container)
              containers.length > 1 &&
                React.createElement(
                  "button",
                  {
                    onClick: () => removeContainer(index),
                    className:
                      "absolute top-2 right-2 text-red-600 text-xs hover:underline",
                  },
                  "Remove"
                ),

              // Container header with number
              React.createElement(
                "div",
                { className: "flex items-center gap-2" },
                React.createElement(
                  "span",
                  { className: "font-semibold text-sm" },
                  `Container ${index + 1}`
                ),
                index === activeContainerIndex &&
                  React.createElement(
                    "span",
                    { className: "text-xs text-blue-600 font-medium" },
                    "(Currently viewing)"
                  )
              ),

              // Container type selector
              React.createElement(
                "label",
                { className: "text-xs text-gray-700" },
                "Type",
                React.createElement(
                  "select",
                  {
                    className: "border rounded px-2 py-1 w-full text-sm mt-1",
                    value: container.type,
                    onChange: (e) =>
                      updateContainer(index, "type", e.target.value),
                  },
                  ...PALLET_SIZES.map((p) =>
                    React.createElement(
                      "option",
                      { key: p.label, value: p.label },
                      p.label
                    )
                  )
                )
              ),

              // Manual dimension inputs
              React.createElement(
                "div",
                { className: "grid grid-cols-2 gap-2 mt-2" },
                // Length
                React.createElement(
                  "label",
                  { className: "text-xs text-gray-700" },
                  "Length (mm)",
                  React.createElement("input", {
                    type: "number",
                    min: 0,
                    step: 1,
                    value: container.L || "",
                    onChange: (e) =>
                      updateContainer(index, "L", parseFloat(e.target.value) || 0),
                    className: "border rounded px-2 py-1 w-full text-sm mt-1",
                  })
                ),
                // Width
                React.createElement(
                  "label",
                  { className: "text-xs text-gray-700" },
                  "Width (mm)",
                  React.createElement("input", {
                    type: "number",
                    min: 0,
                    step: 1,
                    value: container.W || "",
                    onChange: (e) =>
                      updateContainer(index, "W", parseFloat(e.target.value) || 0),
                    className: "border rounded px-2 py-1 w-full text-sm mt-1",
                  })
                ),
                // Height
                React.createElement(
                  "label",
                  { className: "text-xs text-gray-700" },
                  "Height (mm)",
                  React.createElement("input", {
                    type: "number",
                    min: 0,
                    step: 1,
                    value: container.H || "",
                    onChange: (e) =>
                      updateContainer(index, "H", parseFloat(e.target.value) || 0),
                    className: "border rounded px-2 py-1 w-full text-sm mt-1",
                  })
                ),
                // Weight Limit
                React.createElement(
                  "label",
                  { className: "text-xs text-gray-700" },
                  "Weight Limit (kg)",
                  React.createElement("input", {
                    type: "number",
                    min: 0,
                    step: 0.01,
                    value: container.weightLimit || "",
                    onChange: (e) =>
                      updateContainer(index, "weightLimit", parseFloat(e.target.value) || 0),
                    className: "border rounded px-2 py-1 w-full text-sm mt-1",
                  })
                )
              ),

              // Allowed Groups Multi-select (full width, after grid)
              React.createElement(
                "div",
                { className: "mt-2" },
                React.createElement(
                  "label",
                  { className: "text-xs text-gray-700 block mb-1" },
                  "Restrict to Groups (leave empty for all)"
                ),
                React.createElement(
                  "div",
                  { className: "border rounded px-2 py-2 bg-gray-50 space-y-1 max-h-24 overflow-y-auto" },
                  cartonGroups.length === 0
                    ? React.createElement(
                        "div",
                        { className: "text-xs text-gray-500 italic" },
                        "No groups available"
                      )
                    : cartonGroups.map((group) =>
                        React.createElement(
                          "label",
                          {
                            key: group.id,
                            className: "flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded"
                          },
                          React.createElement("input", {
                            type: "checkbox",
                            checked: (container.allowedGroups || []).includes(group.id),
                            onChange: (e) => {
                              const currentGroups = container.allowedGroups || [];
                              const newGroups = e.target.checked
                                ? [...currentGroups, group.id]
                                : currentGroups.filter(id => id !== group.id);
                              updateContainerGroups(index, newGroups);
                            },
                            className: "w-3 h-3 cursor-pointer"
                          }),
                          React.createElement(
                            "span",
                            { className: "flex items-center gap-1.5" },
                            React.createElement("div", {
                              className: "w-2 h-2 rounded-sm",
                              style: { backgroundColor: group.color }
                            }),
                            group.name
                          )
                        )
                      )
                )
              ),

              // View button
              React.createElement(
                "button",
                {
                  className: `px-3 py-1 rounded-lg text-sm ${
                    index === activeContainerIndex
                      ? "bg-teal-500 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`,
                  onClick: () => setActiveContainerIndex(index),
                },
                index === activeContainerIndex ? "Viewing" : "View This Container"
              )
            )
          ),

          // Multi-container summary (only show if multiple containers and packing is active)
          containers.length > 1 && multiContainerPacking && React.createElement(
            "div",
            { className: "p-3 bg-blue-50 border border-blue-200 rounded-xl" },
            React.createElement(
              "h4",
              { className: "text-sm font-semibold text-blue-900 mb-2" },
              "Multi-Container Summary"
            ),
            React.createElement(
              "div",
              { className: "text-xs space-y-1" },
              // Total cartons placed across all containers
              React.createElement(
                "div",
                { className: "flex justify-between" },
                React.createElement("span", { className: "text-gray-700" }, "Total cartons placed:"),
                React.createElement(
                  "span",
                  { className: "font-semibold text-blue-900" },
                  multiContainerPacking.reduce((sum, c) => sum + (c.totalCartons || 0), 0)
                )
              ),
              // Total weight across all containers
              React.createElement(
                "div",
                { className: "flex justify-between" },
                React.createElement("span", { className: "text-gray-700" }, "Total weight:"),
                React.createElement(
                  "span",
                  { className: "font-semibold text-blue-900" },
                  `${multiContainerPacking.reduce((sum, c) => sum + (c.totalWeight || 0), 0).toFixed(1)} kg`
                )
              ),
              // Containers used
              React.createElement(
                "div",
                { className: "flex justify-between" },
                React.createElement("span", { className: "text-gray-700" }, "Containers with cartons:"),
                React.createElement(
                  "span",
                  { className: "font-semibold text-blue-900" },
                  `${multiContainerPacking.filter(c => (c.totalCartons || 0) > 0).length} of ${containers.length}`
                )
              ),
              // Breakdown by container
              React.createElement(
                "div",
                { className: "mt-2 pt-2 border-t border-blue-200" },
                React.createElement("div", { className: "font-medium text-gray-700 mb-1" }, "Per container:"),
                multiContainerPacking.map((packResult, idx) =>
                  React.createElement(
                    "div",
                    { key: idx, className: "flex justify-between text-gray-600 ml-2" },
                    React.createElement("span", null, `Container ${idx + 1}:`),
                    React.createElement(
                      "span",
                      null,
                      `${packResult.totalCartons || 0} cartons (${(packResult.totalWeight || 0).toFixed(1)} kg)`
                    )
                  )
                )
              )
            )
          ),

          // Spread across containers checkbox (only show if multiple containers)
          containers.length > 1 && React.createElement(
            "label",
            { className: "flex items-center gap-2 text-sm cursor-pointer" },
            React.createElement("input", {
              type: "checkbox",
              checked: spreadAcrossContainers,
              onChange: (e) => setSpreadAcrossContainers(e.target.checked),
              className: "w-4 h-4 cursor-pointer",
            }),
            React.createElement(
              "span",
              { className: "text-gray-700" },
              "Force spread cartons evenly across all containers"
            )
          ),

          React.createElement(
            "p",
            { className: "text-xs text-gray-600 mt-1" },
            spreadAcrossContainers && containers.length > 1
              ? "Cartons will be distributed evenly across all containers (not sequential fill)."
              : "Add multiple containers to distribute your carton groups across several shipments."
          )
        ),

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
            ? `⚠️ Total container weight ${palletWeight.toFixed(
                2
              )} kg exceeds ${containerLimits.palletGrossMax} kg limit!`
            : `Total container weight: ${palletWeight.toFixed(2)} kg`
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
          palletL: containerLimits.palletL,
          palletW: containerLimits.palletW,
          palletH: containerLimits.palletH,
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
          activeContainerIndex: activeContainerIndex,
          totalContainers: containers.length,
          onContainerChange: setActiveContainerIndex,
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

          // Per pallet card
          React.createElement(MetricCard, {
            title: "Per Container",
            subtitle: isMultiActive
              ? `Multi-group: ${cartonsPerPallet} cartons across ${palletLayers} layer${
                  palletLayers === 1 ? "" : "s"
                }`
              : `${palletTile.perLayer} cartons/layer × ${palletLayers} layers`,
            value: `${numberFmt(
              effectiveCartons
            )} cartons with ${totalInnersPerPallet}`,
            unit: "inner products",
            footer: `${palletWeight.toFixed(1)} kg total ${
              palletOverweight ? ` ⚠️ OVER LIMIT (remove ${(palletWeight - containerLimits.palletGrossMax).toFixed(1)} kg)` : ""
            }`,
            error: palletOverweight,
          }),

          // Optimization summary
          React.createElement(window.CartonApp.Components.OptimizationDetails, {
            palletTile,
            limits: containerLimits,
            palletLayers: singleLayers,
            cartonsPerPallet: singleCartonsPerPallet,
            carton,
            multiPack,
            isMultiActive,
          }),
        ),

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
