import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { PART_BY_ID } from '../catalog';
import type { KitItem } from '../types';
import { buildPart } from './parts';

type TransformMode = 'translate' | 'rotate';

interface StudioCallbacks {
  onSelect: (id: string | null) => void;
  onTransformStart: () => void;
  onTransform: (item: KitItem) => void;
}

export class Studio {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.05, 100);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly orbit: OrbitControls;
  private readonly transform: TransformControls;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly objects = new Map<string, THREE.Group>();
  private readonly signatures = new Map<string, string>();
  private readonly callbacks: StudioCallbacks;
  private selection: THREE.Group | null = null;
  private outline: THREE.BoxHelper | null = null;
  private animationFrame = 0;
  private readonly resizeObserver: ResizeObserver;

  constructor(canvas: HTMLCanvasElement, callbacks: StudioCallbacks) {
    this.callbacks = callbacks;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.scene.background = new THREE.Color(0x111720);
    this.scene.fog = new THREE.FogExp2(0x111720, 0.035);

    this.camera.position.set(4.8, 3.25, 5.6);
    this.orbit = new OrbitControls(this.camera, canvas);
    this.orbit.target.set(0, 0.7, 0.2);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.07;
    this.orbit.minDistance = 2.2;
    this.orbit.maxDistance = 14;
    this.orbit.maxPolarAngle = Math.PI / 2.02;

    this.transform = new TransformControls(this.camera, canvas);
    this.transform.setSize(0.72);
    this.transform.setSpace('world');
    this.scene.add(this.transform.getHelper());
    this.transform.addEventListener('dragging-changed', (event) => { this.orbit.enabled = !event.value; });
    this.transform.addEventListener('mouseDown', () => this.callbacks.onTransformStart());
    this.transform.addEventListener('objectChange', () => this.emitTransform());

    this.addEnvironment();
    canvas.addEventListener('pointerdown', (event) => this.handlePointer(event));
    canvas.addEventListener('dblclick', () => this.focusSelection());
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
    this.resize();
    this.animate();
  }

  private addEnvironment(): void {
    this.scene.add(new THREE.HemisphereLight(0xd8e8ff, 0x1b1612, 2.25));
    const key = new THREE.DirectionalLight(0xffead2, 4.2);
    key.position.set(-3, 6, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = key.shadow.camera.bottom = -5;
    key.shadow.camera.right = key.shadow.camera.top = 5;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x69a8d8, 2.4);
    rim.position.set(4, 3, -4);
    this.scene.add(rim);

    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x191f28, roughness: 0.9, metalness: 0.05 });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(5.2, 96), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(10, 40, 0x46505d, 0x2a323d);
    grid.position.y = 0.006;
    const materials = Array.isArray(grid.material) ? grid.material : [grid.material];
    materials.forEach((material) => { material.transparent = true; material.opacity = 0.42; });
    this.scene.add(grid);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.15, 3.18, 96),
      new THREE.MeshBasicMaterial({ color: 0xd0833b, transparent: true, opacity: 0.24, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    this.scene.add(ring);
  }

  sync(items: KitItem[], selectedId: string | null): void {
    const incoming = new Set(items.map((item) => item.id));
    for (const [id, object] of this.objects) {
      if (!incoming.has(id)) {
        this.scene.remove(object);
        this.disposeObject(object);
        this.objects.delete(id);
        this.signatures.delete(id);
      }
    }

    for (const item of items) {
      const definition = PART_BY_ID.get(item.partId);
      if (!definition) continue;
      const signature = `${item.partId}:${item.finish}`;
      let object = this.objects.get(item.id);
      if (!object || this.signatures.get(item.id) !== signature) {
        if (object) {
          this.scene.remove(object);
          this.disposeObject(object);
        }
        object = buildPart(definition, item.finish);
        object.userData.itemId = item.id;
        object.userData.partId = item.partId;
        this.objects.set(item.id, object);
        this.signatures.set(item.id, signature);
        this.scene.add(object);
      }
      object.position.set(...item.position);
      object.rotation.set(...item.rotation);
      object.scale.setScalar(item.scale);
    }
    this.setSelection(selectedId);
  }

  setMode(mode: TransformMode): void {
    this.transform.setMode(mode);
    this.transform.showY = mode === 'translate';
  }

  setSelection(id: string | null): void {
    const object = id ? this.objects.get(id) ?? null : null;
    if (object === this.selection) return;
    this.selection = object;
    this.transform.detach();
    if (this.outline) {
      this.scene.remove(this.outline);
      this.outline.dispose();
      this.outline = null;
    }
    if (object) {
      this.transform.attach(object);
      this.outline = new THREE.BoxHelper(object, 0xef9b4b);
      const material = this.outline.material as THREE.LineBasicMaterial;
      material.transparent = true;
      material.opacity = 0.45;
      this.scene.add(this.outline);
    }
  }

  homeView(): void {
    this.camera.position.set(4.8, 3.25, 5.6);
    this.orbit.target.set(0, 0.7, 0.2);
    this.orbit.update();
  }

  topView(): void {
    this.camera.position.set(0.001, 8, 0.001);
    this.orbit.target.set(0, 0, 0);
    this.orbit.update();
  }

  private focusSelection(): void {
    if (!this.selection) return;
    const box = new THREE.Box3().setFromObject(this.selection);
    const centre = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    const direction = this.camera.position.clone().sub(this.orbit.target).normalize();
    this.orbit.target.copy(centre);
    this.camera.position.copy(centre.clone().add(direction.multiplyScalar(Math.max(2.2, size * 2.2))));
  }

  private handlePointer(event: PointerEvent): void {
    if (event.button !== 0 || this.transform.dragging) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects([...this.objects.values()], true);
    let hit: THREE.Object3D | null = hits[0]?.object ?? null;
    while (hit && !hit.userData.itemId) hit = hit.parent;
    this.callbacks.onSelect((hit?.userData.itemId as string | undefined) ?? null);
  }

  private emitTransform(): void {
    if (!this.selection) return;
    this.outline?.update();
    const current = this.selection;
    this.callbacks.onTransform({
      id: current.userData.itemId as string,
      partId: current.userData.partId as string,
      position: [current.position.x, Math.max(0, current.position.y), current.position.z],
      rotation: [current.rotation.x, current.rotation.y, current.rotation.z],
      scale: current.scale.x,
      finish: '#c8782d',
    });
  }

  private resize(): void {
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private animate = (): void => {
    this.animationFrame = requestAnimationFrame(this.animate);
    this.orbit.update();
    this.outline?.update();
    this.renderer.render(this.scene, this.camera);
  };

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    });
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
    this.renderer.dispose();
  }
}
