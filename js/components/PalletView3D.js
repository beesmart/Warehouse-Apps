// js/components/PalletView3D.js
// Pallet visualization component (2D + 3D)

window.CartonApp = window.CartonApp || {};
window.CartonApp.Components = window.CartonApp.Components || {};
window.CartonApp.Constants = window.CartonApp.Constants || {};
window.CartonApp.Utils = window.CartonApp.Utils || {};

const LayerGrid2D = window.CartonApp.Components.LayerGrid2D;
// const DIMENSION_COLORS = window.CartonApp.Constants.DIMENSION_COLORS;

// ----------------------------------------------------
// Helper: Create 3D Scene
// ----------------------------------------------------
function create3DScene(mountRef, config) {
  const { width, height, cameraDistance = 3000, cameraHeight = 2000 } = config;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f5f5);

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
  camera.position.set(cameraDistance, cameraHeight, cameraDistance);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mountRef.current.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
  directionalLight.position.set(1000, 2000, 1000);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  const groundGeometry = new THREE.PlaneGeometry(5000, 5000);
  const groundMaterial = new THREE.MeshLambertMaterial({ color: 0xe0e0e0 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -10;
  ground.receiveShadow = true;
  scene.add(ground);

  return { scene, camera, renderer };
}

// ----------------------------------------------------
// Helper: Add pallet base
// ----------------------------------------------------
function addPalletBase(scene, palletL, palletW) {
  const geometry = new THREE.BoxGeometry(palletL, 100, palletW);
  const material = new THREE.MeshLambertMaterial({ color: 0x8b7355 });
  const pallet = new THREE.Mesh(geometry, material);
  pallet.position.y = 50;
  pallet.castShadow = true;
  pallet.receiveShadow = true;
  scene.add(pallet);
  return pallet;
}

// ----------------------------------------------------
// Helper: Add height guide plane + dashed box outline
// ----------------------------------------------------
function addHeightGuide(scene, palletL, palletW, palletH) {
  const planeGeometry = new THREE.PlaneGeometry(palletL, palletW);
  const planeMaterial = new THREE.MeshBasicMaterial({
    color: 0x60a5fa,
    opacity: 0.15,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = palletH + 100;
  scene.add(plane);

  const edges = new THREE.EdgesGeometry(
    new THREE.BoxGeometry(palletL, palletH, palletW)
  );
  const material = new THREE.LineDashedMaterial({
    color: 0x3b82f6,
    dashSize: 50,
    gapSize: 30,
    opacity: 0.4,
    transparent: true,
  });
  const outline = new THREE.LineSegments(edges, material);
  outline.computeLineDistances();
  outline.position.y = palletH / 2 + 100;
  scene.add(outline);
}

// ----------------------------------------------------
// Helper: Add dimension arrows (L, W, H)
// ----------------------------------------------------
function addDimensionArrows(scene, palletL, palletW, palletH) {
  const origin = new THREE.Vector3(-palletL / 2, 50, -palletW / 2);
  const arrowLength = Math.max(palletL, palletW, palletH) * 0.5;
  const arrowHead = 100;

  const addArrow = (dir, color, label) => {
    const arrow = new THREE.ArrowHelper(
      dir.clone().normalize(),
      origin,
      arrowLength,
      color,
      arrowHead,
      arrowHead * 0.6
    );
    scene.add(arrow);

    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.font = "bold 64px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(300, 150, 1);
    sprite.position.copy(origin.clone().add(dir.clone().multiplyScalar(arrowLength * 1.1)));
    scene.add(sprite);
  };

  addArrow(new THREE.Vector3(1, 0, 0), DIMENSION_COLORS.L, "L");
  addArrow(new THREE.Vector3(0, 0, 1), DIMENSION_COLORS.W, "W");
  addArrow(new THREE.Vector3(0, 1, 0), DIMENSION_COLORS.H, "H");
}

// ----------------------------------------------------
// PalletView3D Component
// ----------------------------------------------------
window.CartonApp.Components.PalletView3D = function ({
  palletL,
  palletW,
  palletH,
  cartonL,
  cartonW,
  cartonH,
  pattern,
  perLayer,
  layers,
  patternRows,
  palletTile,
  cartonWeight,
}) {
  const mountRef = React.useRef(null);
  const sceneRef = React.useRef(null);
  const rendererRef = React.useRef(null);
  const frameRef = React.useRef(null);
  const [viewMode, setViewMode] = React.useState("3D");

  // Compute usage metrics
  const palletSurfaceArea = palletL * palletW;
  const palletVolume = palletL * palletW * palletH;
  const usedSurfaceArea = (palletTile.usedL || 0) * (palletTile.usedW || 0);
  const surfaceUsage =
    palletSurfaceArea > 0 ? (usedSurfaceArea / palletSurfaceArea) * 100 : 0;
  const cartonsVolume = perLayer * layers * cartonL * cartonW * cartonH;
  const volumeUsage =
    palletVolume > 0 ? (cartonsVolume / palletVolume) * 100 : 0;

  React.useEffect(() => {
    if (!mountRef.current || viewMode !== "3D") return;

    const mount = mountRef.current;
    let width = mount.clientWidth;
    let height = 400;

    const { scene, camera, renderer } = create3DScene(mountRef, {
      width,
      height,
      cameraDistance: 2500,
      cameraHeight: 2000,
    });

    sceneRef.current = scene;
    rendererRef.current = renderer;

      // ✅ Center correctly on resize or grid load
    const resizeObserver = new ResizeObserver(() => {
        if (!rendererRef.current || !camera) return;
        const newWidth = mount.clientWidth;
        const newHeight = 400;
        rendererRef.current.setSize(newWidth, newHeight);
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
    });
    resizeObserver.observe(mount);

    // Pallet + guide
    addPalletBase(scene, palletL, palletW);
    addHeightGuide(scene, palletL, palletW, palletH);
    addDimensionArrows(scene, palletL, palletW, palletH);

    // Materials
    const standardMaterial = new THREE.MeshLambertMaterial({ color: 0x4a9eff });
    const rotatedMaterial = new THREE.MeshLambertMaterial({ color: 0x60a5fa });
    const cartonGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cartonEdges = new THREE.EdgesGeometry(cartonGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x1e40af,
      linewidth: 1,
    });

    // Add cartons
    for (let layer = 0; layer < layers; layer++) {
      const yOffset = 100 + layer * cartonH + cartonH / 2;
      if (patternRows) {
        let zStart = -palletW / 2;
        patternRows.forEach((row) => {
          const { rotated, countL, boxL: rowBoxL, boxW: rowBoxW } = row;
          const rowUsedL = countL * rowBoxL;
          const xStart = -rowUsedL / 2;
          for (let i = 0; i < countL; i++) {
            const carton = new THREE.Mesh(
              cartonGeometry,
              rotated ? rotatedMaterial : standardMaterial
            );
            const edges = new THREE.LineSegments(cartonEdges, edgeMaterial);
            const xPos = xStart + rowBoxL / 2 + i * rowBoxL;
            const zPos = zStart + rowBoxW / 2;
            carton.scale.set(rowBoxL, cartonH, rowBoxW);
            edges.scale.set(rowBoxL, cartonH, rowBoxW);
            carton.position.set(xPos, yOffset, zPos);
            edges.position.set(xPos, yOffset, zPos);
            carton.castShadow = true;
            carton.receiveShadow = true;
            scene.add(carton);
            scene.add(edges);
          }
          zStart += rowBoxW;
        });
      } else {
        const countL = Math.floor(palletL / cartonL);
        const countW = Math.floor(palletW / cartonW);
        const usedL = countL * cartonL;
        const usedW = countW * cartonW;
        const xStart = -usedL / 2;
        const zStart = -usedW / 2;
        for (let i = 0; i < countL; i++) {
          for (let j = 0; j < countW; j++) {
            const carton = new THREE.Mesh(cartonGeometry, standardMaterial);
            const edges = new THREE.LineSegments(cartonEdges, edgeMaterial);
            carton.scale.set(cartonL, cartonH, cartonW);
            edges.scale.set(cartonL, cartonH, cartonW);
            const xPos = xStart + cartonL / 2 + i * cartonL;
            const zPos = zStart + cartonW / 2 + j * cartonW;
            carton.position.set(xPos, yOffset, zPos);
            edges.position.set(xPos, yOffset, zPos);
            carton.castShadow = true;
            carton.receiveShadow = true;
            scene.add(carton);
            scene.add(edges);
          }
        }
      }
    }

    // Camera controls
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let rotX = Math.PI / 4;
    let rotY = 0.3;

    const onDown = (e) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
      mountRef.current.style.cursor = "grabbing";
    };
    const onMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      rotX += dx * 0.01;
      rotY = Math.max(0.1, Math.min(1.2, rotY - dy * 0.005));
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onUp = () => {
      isDragging = false;
      mountRef.current.style.cursor = "grab";
    };

    mountRef.current.addEventListener("mousedown", onDown);
    mountRef.current.addEventListener("mousemove", onMove);
    mountRef.current.addEventListener("mouseup", onUp);
    mountRef.current.addEventListener("mouseleave", onUp);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    mountRef.current.style.cursor = "grab";

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const radius = 3000;
      const height = 800 + rotY * 1500;
      camera.position.x = Math.sin(rotX) * radius;
      camera.position.y = height;
      camera.position.z = Math.cos(rotX) * radius;
      camera.lookAt(0, palletH / 2, 0);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      resizeObserver.disconnect();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      if (rendererRef.current) rendererRef.current.dispose();
    };
  }, [palletL, palletW, palletH, cartonL, cartonW, cartonH, pattern, perLayer, layers, patternRows, viewMode]);

  // ----------------------------------------------------
  // Render
  // ----------------------------------------------------
  return React.createElement(
    "div",
    { className: "p-4 border rounded-2xl shadow-sm bg-white" },
    React.createElement(
      "div",
      { className: "flex items-center justify-between mb-2" },
      React.createElement("h4", { className: "font-semibold" }, "Pallet Visualization"),
      React.createElement(
        "div",
        { className: "flex gap-1" },
        React.createElement(
          "button",
          {
            onClick: () => setViewMode("2D"),
            className: `px-3 py-1 text-sm rounded-lg transition-colors ${
              viewMode === "2D"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`,
          },
          "2D"
        ),
        React.createElement(
          "button",
          {
            onClick: () => setViewMode("3D"),
            className: `px-3 py-1 text-sm rounded-lg transition-colors ${
              viewMode === "3D"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`,
          },
          "3D"
        )
      )
    ),

    viewMode === "3D"
      ? React.createElement(
          React.Fragment,
          null,
          React.createElement("div", {
            ref: mountRef,
            className: "bg-gray-50 rounded-xl overflow-hidden",
            style: { height: "400px" },
          }),
          React.createElement(
            "div",
            {
              className: "text-xs text-gray-500 mt-2 text-center",
            },
            "Click and drag to rotate view"
          )
        )
      : React.createElement(LayerGrid2D, {
          spaceL: palletL,
          spaceW: palletW,
          boxL: cartonL,
          boxW: cartonW,
          boxH: cartonH,
          countL: Math.floor(palletL / cartonL),
          countW: Math.floor(palletW / cartonW),
          usedL: Math.floor(palletL / cartonL) * cartonL,
          usedW: Math.floor(palletW / cartonW) * cartonW,
          patternRows: patternRows,
          pattern: palletTile.pattern,
        }),

    // Stats summary
    React.createElement(
      "div",
      { className: "grid grid-cols-2 gap-2 text-sm mt-2" },
      React.createElement(
        "div",
        { className: "grid grid-cols-2 gap-2" },
        React.createElement("div", null, React.createElement("span", { className: "text-gray-500" }, "Layers:"), " ", layers),
        React.createElement("div", null, React.createElement("span", { className: "text-gray-500" }, "Cartons/layer:"), " ", perLayer),
        React.createElement("div", null, React.createElement("span", { className: "text-gray-500" }, "Total cartons:"), " ", perLayer * layers),
        React.createElement("div", null, React.createElement("span", { className: "text-gray-500" }, "Total weight:"), " ", (perLayer * layers * cartonWeight).toFixed(1), " kg")
      ),
      React.createElement(
        "div",
        { className: "grid grid-cols-2 gap-2" },
        React.createElement("div", null, React.createElement("span", { className: "text-gray-500" }, "Surface usage:"), " ", surfaceUsage.toFixed(1), "%"),
        React.createElement("div", null, React.createElement("span", { className: "text-gray-500" }, "Volume usage:"), " ", volumeUsage.toFixed(1), "%"),
        React.createElement("div", null, React.createElement("span", { className: "text-gray-500" }, "Stack height:"), " ", layers * cartonH, " mm"),
        React.createElement("div", null, React.createElement("span", { className: "text-gray-500" }, "Height unused:"), " ", palletH - layers * cartonH, " mm")
      )
    )
  );
};
