import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PART_BY_ID } from '../catalog';
import {
  STUDIO_CAMERA,
  contactShadowFootprint,
  createContactShadowTexture,
  createStudioLights,
  selectStudioQuality,
} from './studioEnvironment';

describe('studio environment', () => {
  it('uses photographic perspective and clear home and top compositions', () => {
    expect(STUDIO_CAMERA.fov).toBeGreaterThanOrEqual(35);
    expect(STUDIO_CAMERA.fov).toBeLessThanOrEqual(40);
    expect(STUDIO_CAMERA.home.position[1]).toBeGreaterThan(STUDIO_CAMERA.home.target[1]);
    expect(STUDIO_CAMERA.home.position[2]).toBeGreaterThan(5);
    expect(STUDIO_CAMERA.top.position[1]).toBeGreaterThanOrEqual(8);
    expect(STUDIO_CAMERA.top.target).toEqual([0, 0, 0]);
  });

  it('selects a full-quality desktop path and a bounded mobile path', () => {
    const desktop = selectStudioQuality({
      devicePixelRatio: 2,
      viewportWidth: 1440,
      hardwareConcurrency: 12,
      deviceMemory: 16,
      coarsePointer: false,
    });
    expect(desktop.name).toBe('high');
    expect(desktop.pixelRatioCap).toBe(2);
    expect(desktop.shadowMapSize).toBe(2048);
    expect(desktop.environmentMapSize).toBe(256);
    expect(desktop.antialias).toBe(true);

    const mobile = selectStudioQuality({
      devicePixelRatio: 3,
      viewportWidth: 390,
      hardwareConcurrency: 8,
      deviceMemory: 8,
      coarsePointer: true,
    });
    expect(mobile.name).toBe('economy');
    expect(mobile.pixelRatioCap).toBeLessThanOrEqual(1.25);
    expect(mobile.shadowMapSize).toBeLessThanOrEqual(1024);
    expect(mobile.environmentMapSize).toBeLessThanOrEqual(128);
    expect(mobile.antialias).toBe(false);

    expect(selectStudioQuality({
      devicePixelRatio: 1,
      viewportWidth: 1200,
      hardwareConcurrency: 4,
      deviceMemory: 4,
      coarsePointer: false,
    }).name).toBe('economy');
  });

  it('builds a balanced key, fill and rim rig with one soft shadow caster', () => {
    const quality = selectStudioQuality({
      devicePixelRatio: 1,
      viewportWidth: 1200,
      hardwareConcurrency: 8,
      deviceMemory: 8,
      coarsePointer: false,
    });
    const lights = createStudioLights(quality);
    const key = lights.getObjectByName('studio-key') as THREE.DirectionalLight;
    const fill = lights.getObjectByName('studio-fill') as THREE.DirectionalLight;
    const rim = lights.getObjectByName('studio-rim') as THREE.DirectionalLight;
    const hemisphere = lights.getObjectByName('studio-ambient') as THREE.HemisphereLight;

    expect(key.castShadow).toBe(true);
    expect(key.shadow.mapSize.width).toBe(quality.shadowMapSize);
    expect(key.shadow.normalBias).toBeGreaterThan(0);
    expect(fill.castShadow).toBe(false);
    expect(rim.castShadow).toBe(false);
    expect(key.intensity).toBeGreaterThan(fill.intensity);
    expect(rim.intensity).toBeGreaterThan(fill.intensity);
    expect(hemisphere.intensity).toBeLessThan(fill.intensity);
  });

  it('generates a smooth, transparent contact-shadow falloff', () => {
    const texture = createContactShadowTexture(64);
    const image = texture.image as { data: Uint8Array; width: number; height: number };
    const alphaAt = (x: number, y: number) => image.data[(y * image.width + x) * 4 + 3];

    expect(alphaAt(32, 32)).toBeGreaterThan(220);
    expect(alphaAt(0, 0)).toBe(0);
    expect(alphaAt(16, 32)).toBeGreaterThan(alphaAt(8, 32));
    expect(texture.colorSpace).toBe(THREE.NoColorSpace);
    expect(texture.magFilter).toBe(THREE.LinearFilter);
    texture.dispose();
  });

  it('sizes grounding for shells, pedals and tripod-based parts', () => {
    const kick = contactShadowFootprint(PART_BY_ID.get('kick-22')!);
    const pedal = contactShadowFootprint(PART_BY_ID.get('pedal-double')!);
    const stand = contactShadowFootprint(PART_BY_ID.get('stand-straight')!);
    const snare = contactShadowFootprint(PART_BY_ID.get('snare-14')!);

    expect(kick[0]).toBeGreaterThan(1.4);
    expect(kick[1]).toBeGreaterThan(1);
    expect(pedal[0]).toBeGreaterThan(stand[0]);
    expect(snare[0]).toBeGreaterThan(0.7);
    expect(stand[0]).toBeCloseTo(stand[1]);
  });
});
