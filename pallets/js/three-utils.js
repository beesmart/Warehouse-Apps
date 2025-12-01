// js/three-utils.js
// Three.js utility functions

window.CartonApp.ThreeUtils = {
  create3DScene: function(mountRef, config) {
    const { width, height, cameraDistance = 3000, cameraHeight = 2000 } = config;
    const { colors } = window.CartonApp.Constants.THREE_CONFIG;
    
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.scene);
    
    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
    camera.position.set(cameraDistance, cameraHeight, cameraDistance);
    camera.lookAt(0, 0, 0);
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(1000, 2000, 1000);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 5000;
    directionalLight.shadow.camera.left = -2000;
    directionalLight.shadow.camera.right = 2000;
    directionalLight.shadow.camera.top = 2000;
    directionalLight.shadow.camera.bottom = -2000;
    scene.add(directionalLight);
    
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(5000, 5000);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: colors.ground });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -10;
    ground.receiveShadow = true;
    scene.add(ground);
    
    return { scene, camera, renderer };
  },

  addPalletBase: function(scene, palletL, palletW) {
    const { colors, palletBaseHeight } = window.CartonApp.Constants.THREE_CONFIG;
    const geometry = new THREE.BoxGeometry(palletL, palletBaseHeight, palletW);
    const material = new THREE.MeshLambertMaterial({ color: colors.palletBase });
    const pallet = new THREE.Mesh(geometry, material);
    pallet.position.y = palletBaseHeight / 2;
    pallet.castShadow = true;
    pallet.receiveShadow = true;
    scene.add(pallet);
    return pallet;
  },

  addHeightGuide: function(scene, palletL, palletW, palletH) {
    const { colors, palletBaseHeight } = window.CartonApp.Constants.THREE_CONFIG;
    
    // Transparent plane at max height
    const planeGeometry = new THREE.PlaneGeometry(palletL, palletW);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: colors.heightGuide,
      opacity: 0.15,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = palletH + palletBaseHeight;
    scene.add(plane);
    
    // Dashed outline
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(palletL, palletH, palletW));
    const material = new THREE.LineDashedMaterial({
      color: colors.heightOutline,
      dashSize: 50,
      gapSize: 30,
      opacity: 0.4,
      transparent: true,
    });
    const outline = new THREE.LineSegments(edges, material);
    outline.computeLineDistances();
    outline.position.y = palletH / 2 + palletBaseHeight;
    scene.add(outline);
  },

  setupMouseControls: function(mountRef, camera, renderer, scene, palletH) {
    let isDragging = false;
    let previousMouseX = 0;
    let previousMouseY = 0;
    let rotationX = Math.PI / 4;
    let rotationY = 0.3;
    
    const handleMouseDown = (e) => {
      isDragging = true;
      previousMouseX = e.clientX;
      previousMouseY = e.clientY;
      mountRef.current.style.cursor = 'grabbing';
    };
    
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - previousMouseX;
      const deltaY = e.clientY - previousMouseY;
      
      rotationX += deltaX * 0.01;
      rotationY = Math.max(0.1, Math.min(1.2, rotationY - deltaY * 0.005));
      
      previousMouseX = e.clientX;
      previousMouseY = e.clientY;
    };
    
    const handleMouseUp = () => {
      isDragging = false;
      if (mountRef.current) mountRef.current.style.cursor = 'grab';
    };
    
    // Add event listeners
    mountRef.current.addEventListener('mousedown', handleMouseDown);
    mountRef.current.addEventListener('mousemove', handleMouseMove);
    mountRef.current.addEventListener('mouseup', handleMouseUp);
    mountRef.current.addEventListener('mouseleave', handleMouseUp);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    mountRef.current.style.cursor = 'grab';
    
    // Return animation function and cleanup
    const animate = () => {
      const radius = 3000;
      const height = 800 + rotationY * 1500;
      
      camera.position.x = Math.sin(rotationX) * radius;
      camera.position.y = height;
      camera.position.z = Math.cos(rotationX) * radius;
      camera.lookAt(0, palletH / 2, 0);
      
      renderer.render(scene, camera);
    };
    
    const cleanup = () => {
      if (mountRef.current) {
        mountRef.current.removeEventListener('mousedown', handleMouseDown);
        mountRef.current.removeEventListener('mousemove', handleMouseMove);
        mountRef.current.removeEventListener('mouseup', handleMouseUp);
        mountRef.current.removeEventListener('mouseleave', handleMouseUp);
      }
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
    
    return { animate, cleanup };
  }
};