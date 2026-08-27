import * as THREE from 'three';

export type ShellSurface = 'lacquer' | 'sparkle' | 'pearl';

interface TextureRecord {
  name: string;
  texture: THREE.DataTexture;
  byteLength: number;
}

const textureRecords: TextureRecord[] = [];

function noise(x: number, y: number, seed: number): number {
  let value = Math.imul(x + seed * 1013, 374761393) ^ Math.imul(y + seed * 7919, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
}

function byte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function smoothstep(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

type PixelGenerator = (x: number, y: number, size: number) => [number, number, number, number];

function dataTexture(name: string, size: number, pixel: PixelGenerator, colour = false): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const rgba = pixel(x, y, size);
      data[offset] = byte(rgba[0]);
      data[offset + 1] = byte(rgba[1]);
      data[offset + 2] = byte(rgba[2]);
      data[offset + 3] = byte(rgba[3]);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.name = name;
  texture.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  textureRecords.push({ name, texture, byteLength: data.byteLength });
  return texture;
}

function normalTexture(name: string, size: number, heightAt: (x: number, y: number, size: number) => number, strength = 2): THREE.DataTexture {
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) height[y * size + x] = heightAt(x, y, size);
  }
  return dataTexture(name, size, (x, y) => {
    const left = height[y * size + ((x - 1 + size) % size)];
    const right = height[y * size + ((x + 1) % size)];
    const above = height[((y - 1 + size) % size) * size + x];
    const below = height[((y + 1) % size) * size + x];
    const normal = new THREE.Vector3((left - right) * strength, (above - below) * strength, 1).normalize();
    return [(normal.x * 0.5 + 0.5) * 255, (normal.y * 0.5 + 0.5) * 255, normal.z * 255, 255];
  });
}

const woodSurface = dataTexture('wood-grain-roughness', 128, (x, y) => {
  const grain = Math.sin((x + Math.sin(y * 0.12) * 5) * 0.32) * 12;
  const variation = (noise(x, y, 3) - 0.5) * 22;
  const value = 165 + grain + variation;
  return [value, value, value, 255];
});
woodSurface.repeat.set(3, 1);

const sparkleRoughness = dataTexture('sparkle-roughness', 128, (x, y) => {
  const fleck = noise(x, y, 11) > 0.965 ? 48 : 155 + noise(x, y, 12) * 32;
  return [fleck, fleck, fleck, 255];
});
sparkleRoughness.repeat.set(4, 2);

const sparkleNormal = normalTexture('sparkle-normal', 128, (x, y) => noise(x, y, 11) > 0.965 ? 1 : noise(x, y, 13) * 0.05, 2.8);
sparkleNormal.repeat.set(4, 2);

const pearlRoughness = dataTexture('pearl-roughness', 128, (x, y) => {
  const wave = Math.sin(x * 0.18 + Math.sin(y * 0.09)) * 17;
  const value = 138 + wave + (noise(x, y, 21) - 0.5) * 10;
  return [value, value, value, 255];
});
pearlRoughness.repeat.set(2, 1);

function hammerDimple(x: number, y: number): number {
  const spacing = 11;
  const gridX = Math.floor(x / spacing);
  const gridY = Math.floor(y / spacing);
  let influence = 0;

  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      const cellX = gridX + offsetX;
      const cellY = gridY + offsetY;
      if (noise(cellX, cellY, 31) <= 0.74) continue;
      const centreX = (cellX + 0.5 + (noise(cellX, cellY, 33) - 0.5) * 0.42) * spacing;
      const centreY = (cellY + 0.5 + (noise(cellX, cellY, 34) - 0.5) * 0.42) * spacing;
      const distance = Math.hypot(x - centreX, y - centreY);
      const blend = 1 - smoothstep(distance / (spacing * 0.42));
      influence = Math.max(influence, blend * blend);
    }
  }
  return influence;
}

function radialHeight(x: number, y: number, size: number): number {
  const dx = x - size / 2;
  const dy = y - size / 2;
  const radius = Math.sqrt(dx * dx + dy * dy);
  const lathe = Math.sin(radius * 2.4) * 0.035;
  return lathe - hammerDimple(x, y) * 0.055;
}

const cymbalRoughness = dataTexture('bronze-lathe-roughness', 256, (x, y, size) => {
  const dx = x - size / 2;
  const dy = y - size / 2;
  const radius = Math.sqrt(dx * dx + dy * dy);
  const rings = (Math.sin(radius * 2.4) + 1) * 20;
  const hammer = hammerDimple(x, y) * -14;
  const value = 112 + rings + hammer + (noise(x, y, 32) - 0.5) * 10;
  return [value, value, value, 255];
});
cymbalRoughness.wrapS = cymbalRoughness.wrapT = THREE.ClampToEdgeWrapping;

const cymbalNormal = normalTexture('bronze-hammer-normal', 256, radialHeight, 0.9);
cymbalNormal.wrapS = cymbalNormal.wrapT = THREE.ClampToEdgeWrapping;

function headColour(marked: boolean): THREE.DataTexture {
  return dataTexture(marked ? 'drumhead-marked-colour' : 'drumhead-clear-colour', 128, (x, y, size) => {
    const dx = x - size / 2;
    const dy = y - size / 2;
    const radius = Math.sqrt(dx * dx + dy * dy) / (size / 2);
    const centreMark = marked && radius < 0.13 ? -78 : 0;
    const scuff = radius < 0.42 && noise(x, y, 45) > 0.88 ? -13 : 0;
    const base = 235 + centreMark + scuff + (noise(x, y, 44) - 0.5) * 7;
    return [base, base - 2, base - 7, 255];
  }, true);
}

const clearHeadColour = headColour(false);
const markedHeadColour = headColour(true);
const headRoughness = dataTexture('drumhead-roughness', 128, (x, y) => {
  const value = 126 + (noise(x, y, 46) - 0.5) * 28;
  return [value, value, value, 255];
});

const rubberRoughness = dataTexture('rubber-roughness', 64, (x, y) => {
  const value = 205 + (noise(x, y, 51) - 0.5) * 24;
  return [value, value, value, 255];
});

const feltNormal = normalTexture('felt-fibre-normal', 64, (x, y) => noise(x, y, 61), 0.65);

const finishSurface = new Map<string, ShellSurface>([
  ['#c8782d', 'lacquer'],
  ['#8f2f3a', 'sparkle'],
  ['#202b3b', 'sparkle'],
  ['#235b70', 'pearl'],
  ['#315e4b', 'lacquer'],
  ['#ddd4c2', 'pearl'],
]);

export function surfaceForFinish(finish: string): ShellSurface {
  return finishSurface.get(finish.toLowerCase()) ?? 'lacquer';
}

export function createShellMaterial(finish: string): THREE.MeshPhysicalMaterial {
  const surface = surfaceForFinish(finish);
  const common: THREE.MeshPhysicalMaterialParameters = {
    color: finish,
    clearcoat: surface === 'sparkle' ? 1 : 0.88,
    clearcoatRoughness: surface === 'lacquer' ? 0.14 : 0.2,
    envMapIntensity: 1.15,
    metalness: surface === 'sparkle' ? 0.15 : 0.04,
    roughness: surface === 'lacquer' ? 0.3 : 0.26,
  };
  if (surface === 'lacquer') {
    common.roughnessMap = woodSurface;
    common.bumpMap = woodSurface;
    common.bumpScale = 0.012;
  } else if (surface === 'sparkle') {
    common.roughnessMap = sparkleRoughness;
    common.normalMap = sparkleNormal;
    common.normalScale = new THREE.Vector2(0.18, 0.18);
  } else {
    common.roughnessMap = pearlRoughness;
    common.iridescence = 0.32;
    common.iridescenceIOR = 1.32;
    common.sheen = 0.18;
    common.sheenRoughness = 0.42;
  }
  const material = new THREE.MeshPhysicalMaterial(common);
  material.name = `drum-shell-${surface}`;
  return material;
}

function drumHeadMaterial(name: string, map: THREE.DataTexture): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map,
    roughness: 0.48,
    roughnessMap: headRoughness,
    transmission: 0.06,
    transparent: true,
    opacity: 0.94,
    envMapIntensity: 0.42,
    side: THREE.DoubleSide,
  });
  material.name = name;
  return material;
}

export const materials = {
  chrome: new THREE.MeshStandardMaterial({ name: 'chrome', color: 0xc7ccd1, metalness: 0.96, roughness: 0.16, envMapIntensity: 1.45 }),
  darkChrome: new THREE.MeshStandardMaterial({ name: 'dark-chrome', color: 0x343a42, metalness: 0.9, roughness: 0.24, envMapIntensity: 1.2 }),
  rubber: new THREE.MeshStandardMaterial({ name: 'rubber', color: 0x111419, metalness: 0.01, roughness: 0.88, roughnessMap: rubberRoughness, envMapIntensity: 0.18 }),
  felt: new THREE.MeshStandardMaterial({ name: 'felt', color: 0x34302a, metalness: 0, roughness: 1, normalMap: feltNormal, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 0.08 }),
  clearDrumHead: drumHeadMaterial('clear-drumhead', clearHeadColour),
  markedDrumHead: drumHeadMaterial('marked-drumhead', markedHeadColour),
  cymbalBronze: new THREE.MeshStandardMaterial({
    name: 'cymbal-bronze',
    color: 0xd0a64c,
    metalness: 0.9,
    roughness: 0.31,
    roughnessMap: cymbalRoughness,
    normalMap: cymbalNormal,
    normalScale: new THREE.Vector2(0.1, 0.1),
    envMapIntensity: 1.28,
  }),
};

export interface MaterialLibraryStats {
  textureCount: number;
  rawTextureBytes: number;
  estimatedGpuBytesWithMipmaps: number;
  externalDownloadBytes: 0;
}

export function getMaterialLibraryStats(): MaterialLibraryStats {
  const rawTextureBytes = textureRecords.reduce((total, record) => total + record.byteLength, 0);
  return {
    textureCount: textureRecords.length,
    rawTextureBytes,
    estimatedGpuBytesWithMipmaps: Math.ceil(rawTextureBytes * 4 / 3),
    externalDownloadBytes: 0,
  };
}

export function materialTextures(): readonly THREE.DataTexture[] {
  return textureRecords.map((record) => record.texture);
}
