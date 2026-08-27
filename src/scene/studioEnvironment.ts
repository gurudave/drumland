import * as THREE from 'three';
import type { PartDefinition } from '../types';

export type StudioQualityName = 'high' | 'economy';

export interface RenderCapabilities {
  devicePixelRatio: number;
  viewportWidth: number;
  hardwareConcurrency: number;
  deviceMemory: number;
  coarsePointer: boolean;
}

export interface StudioQuality {
  name: StudioQualityName;
  antialias: boolean;
  pixelRatioCap: number;
  shadowMapSize: number;
  shadowRadius: number;
  environmentMapSize: number;
  contactShadowOpacity: number;
}

interface CameraView {
  position: [number, number, number];
  target: [number, number, number];
}

export const STUDIO_CAMERA: Readonly<{
  fov: number;
  home: CameraView;
  top: CameraView;
}> = {
  fov: 38,
  home: { position: [5.15, 3.35, 6.15], target: [0, 0.78, 0.12] },
  top: { position: [0.001, 8.6, 0.001], target: [0, 0, 0] },
};

const HIGH_QUALITY: StudioQuality = {
  name: 'high',
  antialias: true,
  pixelRatioCap: 2,
  shadowMapSize: 2048,
  shadowRadius: 4,
  environmentMapSize: 256,
  contactShadowOpacity: 0.24,
};

const ECONOMY_QUALITY: StudioQuality = {
  name: 'economy',
  antialias: false,
  pixelRatioCap: 1.25,
  shadowMapSize: 1024,
  shadowRadius: 2,
  environmentMapSize: 128,
  contactShadowOpacity: 0.19,
};

export function selectStudioQuality(capabilities: RenderCapabilities): StudioQuality {
  const constrained = capabilities.hardwareConcurrency <= 4
    || capabilities.deviceMemory <= 4
    || (capabilities.coarsePointer && capabilities.viewportWidth < 720);
  return constrained ? { ...ECONOMY_QUALITY } : { ...HIGH_QUALITY };
}

export function createStudioLights(quality: StudioQuality): THREE.Group {
  const lights = new THREE.Group();
  lights.name = 'studio-lighting-rig';

  const ambient = new THREE.HemisphereLight(0xd9e5f2, 0x18130f, 0.7);
  ambient.name = 'studio-ambient';

  const key = new THREE.DirectionalLight(0xffead5, 3.2);
  key.name = 'studio-key';
  key.position.set(-3.8, 6.2, 4.6);
  key.castShadow = true;
  key.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 18;
  key.shadow.camera.left = key.shadow.camera.bottom = -5;
  key.shadow.camera.right = key.shadow.camera.top = 5;
  key.shadow.bias = -0.00015;
  key.shadow.normalBias = 0.025;
  key.shadow.radius = quality.shadowRadius;

  const fill = new THREE.DirectionalLight(0xc8ddf2, 1.05);
  fill.name = 'studio-fill';
  fill.position.set(4.5, 2.8, 4.2);

  const rim = new THREE.DirectionalLight(0x8dbce2, 1.55);
  rim.name = 'studio-rim';
  rim.position.set(3.2, 4.5, -4.8);

  lights.add(ambient, key, fill, rim);
  return lights;
}

function smoothstep(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

export function createContactShadowTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const centre = (size - 1) / 2;
  const radiusScale = size * 0.48;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const radius = Math.hypot(x - centre, y - centre) / radiusScale;
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = Math.round((1 - smoothstep(radius)) * 255);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.name = 'procedural-contact-shadow';
  texture.colorSpace = THREE.NoColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export function contactShadowFootprint(definition: PartDefinition): [number, number] {
  const { radius, depth } = definition.dimensions;
  if (definition.kind === 'bass-drum') return [radius * 2.3, depth + 0.72];
  if (definition.kind === 'double-pedal') return [radius * 2.15, Math.max(0.68, depth * 1.75)];
  if (definition.kind === 'snare') return [radius * 2.2, radius * 2.2];
  if (definition.kind === 'rack-tom' || definition.kind === 'floor-tom') return [radius * 2.15, radius * 2.15];
  if (definition.kind === 'throne') return [radius * 1.9, radius * 1.9];
  const tripodDiameter = radius * 2;
  return [tripodDiameter, tripodDiameter];
}
