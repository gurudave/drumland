import * as THREE from 'three';
import type { PartDefinition } from '../types';

const chrome = new THREE.MeshStandardMaterial({ color: 0xb8bec5, metalness: 0.92, roughness: 0.2 });
const darkChrome = new THREE.MeshStandardMaterial({ color: 0x3b4149, metalness: 0.85, roughness: 0.28 });
const rubber = new THREE.MeshStandardMaterial({ color: 0x111419, metalness: 0.05, roughness: 0.82 });
const head = new THREE.MeshPhysicalMaterial({ color: 0xe8e4d9, roughness: 0.55, transmission: 0.08, transparent: true, opacity: 0.92 });
const brass = new THREE.MeshStandardMaterial({ color: 0xcaa44f, metalness: 0.86, roughness: 0.28 });

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number] = [0, 0, 0]): THREE.Mesh {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

function pole(radius: number, length: number, position: [number, number, number], material = chrome): THREE.Mesh {
  return mesh(new THREE.CylinderGeometry(radius, radius, length, 12), material, position);
}

function addTripod(group: THREE.Group, height = 0.62, spread = 0.34): void {
  group.add(pole(0.025, height, [0, height / 2, 0]));
  for (let index = 0; index < 3; index += 1) {
    const angle = (index / 3) * Math.PI * 2;
    const leg = pole(0.018, spread, [Math.cos(angle) * spread * 0.42, 0.13, Math.sin(angle) * spread * 0.42], darkChrome);
    leg.rotation.z = Math.PI / 2.8;
    leg.rotation.y = -angle;
    group.add(leg);
    group.add(mesh(new THREE.SphereGeometry(0.035, 10, 8), rubber, [Math.cos(angle) * spread * 0.78, 0.025, Math.sin(angle) * spread * 0.78]));
  }
}

function addDrumLugs(group: THREE.Group, radius: number, bottom: number, top: number, count: number): void {
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const x = Math.cos(angle) * (radius + 0.025);
    const z = Math.sin(angle) * (radius + 0.025);
    group.add(mesh(new THREE.BoxGeometry(0.045, 0.075, 0.035), chrome, [x, bottom + 0.06, z]));
    group.add(mesh(new THREE.BoxGeometry(0.045, 0.075, 0.035), chrome, [x, top - 0.06, z]));
  }
}

function verticalDrum(definition: PartDefinition, finish: string, stand: 'rack' | 'floor' | 'snare'): THREE.Group {
  const group = new THREE.Group();
  const { radius, depth, height } = definition.dimensions;
  const centre = height;
  const shellMaterial = new THREE.MeshPhysicalMaterial({ color: finish, metalness: 0.28, roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  group.add(mesh(new THREE.CylinderGeometry(radius, radius, depth, 48), shellMaterial, [0, centre, 0]));
  group.add(mesh(new THREE.CylinderGeometry(radius * 0.98, radius * 0.98, 0.025, 48), head, [0, centre + depth / 2 + 0.014, 0]));
  const upperHoop = mesh(new THREE.TorusGeometry(radius, 0.023, 10, 48), chrome, [0, centre + depth / 2, 0]);
  const lowerHoop = mesh(new THREE.TorusGeometry(radius, 0.023, 10, 48), chrome, [0, centre - depth / 2, 0]);
  upperHoop.rotation.x = lowerHoop.rotation.x = Math.PI / 2;
  group.add(upperHoop, lowerHoop);
  addDrumLugs(group, radius, centre - depth / 2, centre + depth / 2, radius > 0.43 ? 8 : 6);

  if (stand === 'floor') {
    for (let index = 0; index < 3; index += 1) {
      const angle = (index / 3) * Math.PI * 2;
      const leg = pole(0.016, height * 0.7, [Math.cos(angle) * radius * 0.88, height * 0.32, Math.sin(angle) * radius * 0.88], chrome);
      leg.rotation.z = Math.cos(angle) * 0.16;
      leg.rotation.x = Math.sin(angle) * 0.16;
      group.add(leg);
    }
  } else if (stand === 'snare') {
    addTripod(group, Math.max(0.5, height - depth / 2), radius * 0.9);
  } else {
    group.add(pole(0.024, Math.max(0.65, height - depth / 2), [0, Math.max(0.65, height - depth / 2) / 2, 0]));
    const brace = pole(0.018, radius * 1.5, [0, height - depth / 2 - 0.04, 0]);
    brace.rotation.z = Math.PI / 2;
    group.add(brace);
  }
  return group;
}

function bassDrum(definition: PartDefinition, finish: string): THREE.Group {
  const group = new THREE.Group();
  const { radius, depth } = definition.dimensions;
  const y = radius + 0.06;
  const shellMaterial = new THREE.MeshPhysicalMaterial({ color: finish, metalness: 0.25, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.12 });
  const shell = mesh(new THREE.CylinderGeometry(radius, radius, depth, 64), shellMaterial, [0, y, 0]);
  shell.rotation.x = Math.PI / 2;
  group.add(shell);
  for (const z of [-depth / 2 - 0.012, depth / 2 + 0.012]) {
    const drumHead = mesh(new THREE.CylinderGeometry(radius * 0.985, radius * 0.985, 0.025, 64), head, [0, y, z]);
    drumHead.rotation.x = Math.PI / 2;
    group.add(drumHead);
    group.add(mesh(new THREE.TorusGeometry(radius, 0.032, 12, 64), darkChrome, [0, y, z]));
  }
  for (const side of [-1, 1]) {
    const leg = pole(0.022, 0.55, [side * radius * 0.72, 0.29, depth * 0.18], chrome);
    leg.rotation.z = side * 0.2;
    group.add(leg);
  }
  const pedal = mesh(new THREE.BoxGeometry(0.18, 0.035, 0.42), darkChrome, [0, 0.035, -depth / 2 - 0.22]);
  group.add(pedal, pole(0.014, 0.4, [0, 0.23, -depth / 2 - 0.04], darkChrome));
  const beater = mesh(new THREE.SphereGeometry(0.055, 16, 10), rubber, [0, 0.44, -depth / 2 - 0.01]);
  beater.scale.set(1, 1.25, 0.45);
  group.add(beater);
  return group;
}

function cymbal(definition: PartDefinition): THREE.Group {
  const group = new THREE.Group();
  const { radius, height } = definition.dimensions;
  addTripod(group, height * 0.74, Math.min(0.45, radius * 0.8));
  group.add(pole(0.018, height * 0.52, [0, height * 0.74 + height * 0.26, 0]));
  const isChina = definition.kind === 'china';
  const cymbalMesh = mesh(new THREE.CylinderGeometry(radius * 0.94, radius, isChina ? 0.075 : 0.035, 64, 1), brass, [0, height, 0]);
  cymbalMesh.rotation.x = definition.kind === 'ride' ? -0.1 : 0.08;
  cymbalMesh.rotation.z = definition.kind === 'crash' ? 0.1 : 0;
  group.add(cymbalMesh);
  const bell = mesh(new THREE.SphereGeometry(radius * 0.15, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), brass, [0, height + 0.008, 0]);
  bell.scale.y = 0.42;
  group.add(bell);
  if (isChina) {
    const edge = mesh(new THREE.TorusGeometry(radius * 0.91, 0.035, 8, 64), brass, [0, height + 0.035, 0]);
    edge.rotation.x = Math.PI / 2;
    group.add(edge);
  }
  return group;
}

function hiHat(definition: PartDefinition): THREE.Group {
  const group = new THREE.Group();
  const { radius, height } = definition.dimensions;
  addTripod(group, height * 0.7, 0.32);
  group.add(pole(0.017, height * 0.65, [0, height * 0.68, 0]));
  for (const offset of [0, 0.045]) {
    group.add(mesh(new THREE.CylinderGeometry(radius * 0.93, radius, 0.025, 48), brass, [0, height + offset, 0]));
  }
  group.add(mesh(new THREE.BoxGeometry(0.13, 0.025, 0.34), darkChrome, [0, 0.025, 0.17]));
  return group;
}

function hardware(definition: PartDefinition): THREE.Group {
  const group = new THREE.Group();
  const { height } = definition.dimensions;
  if (definition.kind === 'double-pedal') {
    for (const x of [-0.24, 0.24]) {
      group.add(mesh(new THREE.BoxGeometry(0.2, 0.035, 0.42), darkChrome, [x, 0.035, 0]));
      group.add(pole(0.016, 0.35, [x, 0.22, 0.16], chrome));
      group.add(mesh(new THREE.SphereGeometry(0.05, 14, 10), rubber, [x, 0.4, 0.17]));
    }
    const link = pole(0.018, 0.48, [0, 0.08, 0.14], chrome);
    link.rotation.z = Math.PI / 2;
    group.add(link);
    return group;
  }
  addTripod(group, height * 0.68, definition.dimensions.radius);
  group.add(pole(0.018, height * 0.58, [0, height * 0.67 + height * 0.29, 0]));
  if (definition.kind === 'boom-stand') {
    const boom = pole(0.015, 0.72, [0.27, height, 0]);
    boom.rotation.z = Math.PI / 2.35;
    group.add(boom, mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.13, 12), darkChrome, [-0.02, height * 0.82, 0]));
  }
  if (definition.kind === 'snare-stand') {
    const basket = mesh(new THREE.TorusGeometry(0.25, 0.02, 8, 32), chrome, [0, height, 0]);
    basket.rotation.x = Math.PI / 2;
    group.add(basket);
  }
  return group;
}

function throne(definition: PartDefinition): THREE.Group {
  const group = new THREE.Group();
  const { radius, height } = definition.dimensions;
  addTripod(group, height * 0.72, radius);
  group.add(pole(0.035, height * 0.55, [0, height * 0.65, 0], darkChrome));
  const cushion = mesh(new THREE.CylinderGeometry(radius, radius * 0.95, 0.14, 40), rubber, [0, height, 0]);
  group.add(cushion);
  return group;
}

export function buildPart(definition: PartDefinition, finish: string): THREE.Group {
  let group: THREE.Group;
  switch (definition.kind) {
    case 'bass-drum': group = bassDrum(definition, finish); break;
    case 'snare': group = verticalDrum(definition, finish, 'snare'); break;
    case 'rack-tom': group = verticalDrum(definition, finish, 'rack'); break;
    case 'floor-tom': group = verticalDrum(definition, finish, 'floor'); break;
    case 'hi-hat': group = hiHat(definition); break;
    case 'crash':
    case 'ride':
    case 'china':
    case 'splash': group = cymbal(definition); break;
    case 'throne': group = throne(definition); break;
    default: group = hardware(definition);
  }
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return group;
}
