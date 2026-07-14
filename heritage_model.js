import * as THREE from 'three';
import { OrbitControls } from './vendor/three/OrbitControls.js';
import { MTLLoader } from './vendor/three/MTLLoader.js';
import { OBJLoader } from './vendor/three/OBJLoader.js';

const MODEL_PATH = 'images/culturalheritage/stuttgart/';
const MODEL_UPRIGHT_TILT_FIX = Math.PI / 4;

document.querySelectorAll('[data-heritage-model]').forEach((modelBlock) => {
  const viewport = modelBlock.querySelector('[data-model-viewport]');
  const loading = modelBlock.querySelector('[data-model-loading]');
  const resetButton = modelBlock.querySelector('[data-model-reset]');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf4f7fb);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 5000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  viewport.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.55;
  controls.minDistance = 60;
  controls.maxDistance = 900;

  const ambient = new THREE.HemisphereLight(0xffffff, 0x9aa8bc, 2.2);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
  keyLight.position.set(160, 220, 180);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xb8d7ff, 1.2);
  fillLight.position.set(-180, 130, -150);
  scene.add(fillLight);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(220, 96),
    new THREE.MeshStandardMaterial({ color: 0xe8edf5, roughness: 0.95, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -35;
  floor.receiveShadow = true;
  scene.add(floor);

  let model = null;
  let frameId = null;
  let initialCamera = null;

  function resize() {
    const rect = viewport.getBoundingClientRect();
    const width = Math.max(320, rect.width);
    const height = Math.max(320, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function frameObject(object) {
    // Tinkercad OBJ files are exported Z-up; Three.js uses Y-up.
    object.rotation.set(-Math.PI / 2, 0, 0);
    object.updateMatrixWorld(true);

    const sourceBox = new THREE.Box3().setFromObject(object);
    const center = sourceBox.getCenter(new THREE.Vector3());
    object.position.sub(center);

    object.rotateY(-Math.PI / 5);
    object.rotateZ(MODEL_UPRIGHT_TILT_FIX);
    object.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    floor.position.y = box.min.y - 4;

    const distance = maxDim * 1.55;
    camera.near = Math.max(0.1, maxDim / 100);
    camera.far = maxDim * 20;
    camera.position.set(distance * 0.95, distance * 0.34, distance * 1.28);
    camera.updateProjectionMatrix();

    controls.target.set(0, 0, 0);
    controls.minDistance = maxDim * 0.55;
    controls.maxDistance = maxDim * 4;
    controls.update();

    initialCamera = {
      position: camera.position.clone(),
      target: controls.target.clone(),
    };
  }

  function renderLoop() {
    controls.update();
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(renderLoop);
  }

  function showError() {
    if (!loading) return;
    loading.textContent = 'Unable to load the 3D model.';
    loading.classList.add('is-error');
  }

  function loadModel() {
    resize();

    const mtlLoader = new MTLLoader();
    mtlLoader.setPath(MODEL_PATH);
    mtlLoader.load(
      'obj.mtl',
      (materials) => {
        materials.preload();

        const objLoader = new OBJLoader();
        objLoader.setPath(MODEL_PATH);
        objLoader.setMaterials(materials);
        objLoader.load(
          'tinker.obj',
          (object) => {
            model = object;
            model.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                  child.material.side = THREE.DoubleSide;
                }
              }
            });

            scene.add(model);
            frameObject(model);
            loading?.remove();
            renderLoop();
          },
          undefined,
          showError
        );
      },
      undefined,
      showError
    );
  }

  controls.addEventListener('start', () => {
    controls.autoRotate = false;
  });

  resetButton?.addEventListener('click', () => {
    if (!initialCamera) return;
    camera.position.copy(initialCamera.position);
    controls.target.copy(initialCamera.target);
    controls.autoRotate = true;
    controls.update();
  });

  new ResizeObserver(resize).observe(viewport);
  loadModel();

  window.addEventListener('pagehide', () => {
    if (frameId) cancelAnimationFrame(frameId);
  });
});
