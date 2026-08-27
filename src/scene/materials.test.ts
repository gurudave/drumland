import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  createShellMaterial,
  getMaterialLibraryStats,
  materials,
  materialTextures,
  surfaceForFinish,
} from './materials';

describe('PBR material library', () => {
  it('maps catalogue finishes to their intended surfaces', () => {
    expect(surfaceForFinish('#c8782d')).toBe('lacquer');
    expect(surfaceForFinish('#8F2F3A')).toBe('sparkle');
    expect(surfaceForFinish('#202b3b')).toBe('sparkle');
    expect(surfaceForFinish('#235b70')).toBe('pearl');
    expect(surfaceForFinish('#ddd4c2')).toBe('pearl');
    expect(surfaceForFinish('#123456')).toBe('lacquer');
  });

  it('creates independent shell colours while sharing texture data', () => {
    const amber = createShellMaterial('#c8782d');
    const green = createShellMaterial('#315e4b');
    expect(amber).not.toBe(green);
    expect(`#${amber.color.getHexString()}`).toBe('#c8782d');
    expect(`#${green.color.getHexString()}`).toBe('#315e4b');
    expect(amber.roughnessMap).toBe(green.roughnessMap);
    expect(amber.bumpMap).toBe(green.bumpMap);
    expect(amber.clearcoat).toBeGreaterThan(0.8);
  });

  it('gives lacquer, sparkle and pearl physically distinct properties', () => {
    const lacquer = createShellMaterial('#c8782d');
    const sparkle = createShellMaterial('#8f2f3a');
    const pearl = createShellMaterial('#235b70');
    expect(lacquer.name).toBe('drum-shell-lacquer');
    expect(lacquer.bumpMap).toBeInstanceOf(THREE.DataTexture);
    expect(sparkle.name).toBe('drum-shell-sparkle');
    expect(sparkle.normalMap).toBeInstanceOf(THREE.DataTexture);
    expect(sparkle.metalness).toBeGreaterThan(lacquer.metalness);
    expect(pearl.name).toBe('drum-shell-pearl');
    expect(pearl.iridescence).toBeGreaterThan(0);
  });

  it('centralises recognisable static material classes', () => {
    expect(materials.chrome.metalness).toBeGreaterThan(0.9);
    expect(materials.chrome.roughness).toBeLessThan(0.2);
    expect(materials.darkChrome.roughness).toBeGreaterThan(materials.chrome.roughness);
    expect(materials.cymbalBronze.metalness).toBeGreaterThan(0.85);
    expect(materials.cymbalBronze.normalMap?.name).toBe('bronze-hammer-normal');
    expect(materials.rubber.roughness).toBeGreaterThan(0.8);
    expect(materials.felt.roughness).toBe(1);
    expect(materials.markedDrumHead.transparent).toBe(true);
    expect(materials.markedDrumHead.map).not.toBe(materials.clearDrumHead.map);
  });

  it('keeps cymbal hammering subtle and smoothly blended', () => {
    const normalMap = materials.cymbalBronze.normalMap as THREE.DataTexture;
    const image = normalMap.image as { data: Uint8Array; width: number; height: number };
    let greatestNeighbourChange = 0;

    for (let y = 1; y < image.height - 1; y += 1) {
      for (let x = 1; x < image.width - 1; x += 1) {
        const offset = (y * image.width + x) * 4;
        const right = offset + 4;
        const below = offset + image.width * 4;
        for (const neighbour of [right, below]) {
          const change = Math.hypot(
            image.data[offset] - image.data[neighbour],
            image.data[offset + 1] - image.data[neighbour + 1],
          ) / 255;
          greatestNeighbourChange = Math.max(greatestNeighbourChange, change);
        }
      }
    }

    expect(greatestNeighbourChange).toBeLessThan(0.2);
    expect(materials.cymbalBronze.normalScale.x).toBeLessThanOrEqual(0.12);
    expect(materials.cymbalBronze.normalScale.y).toBeLessThanOrEqual(0.12);
  });

  it('uses correct colour spaces, filtering and wrapping', () => {
    const textures = materialTextures();
    expect(textures).toHaveLength(11);
    for (const texture of textures) {
      const isColour = texture.name.endsWith('-colour');
      expect(texture.colorSpace, texture.name).toBe(isColour ? THREE.SRGBColorSpace : THREE.NoColorSpace);
      expect(texture.magFilter, texture.name).toBe(THREE.LinearFilter);
      expect(texture.minFilter, texture.name).toBe(THREE.LinearMipmapLinearFilter);
      expect(texture.generateMipmaps, texture.name).toBe(true);
      expect(texture.anisotropy, texture.name).toBe(4);
    }
    expect(materials.cymbalBronze.roughnessMap?.wrapS).toBe(THREE.ClampToEdgeWrapping);
  });

  it('keeps the generated texture library within its documented budget', () => {
    expect(getMaterialLibraryStats()).toEqual({
      textureCount: 11,
      rawTextureBytes: 1_015_808,
      estimatedGpuBytesWithMipmaps: 1_354_411,
      externalDownloadBytes: 0,
    });
  });
});
