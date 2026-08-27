import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createPreset } from '../kit';
import { PART_BY_ID } from '../catalog';
import {
  CYMBAL_ANGULAR_SEGMENTS,
  CYMBAL_PROFILES,
  createCymbalGeometry,
  createCymbalProfile,
  type CymbalKind,
} from './cymbalGeometry';
import { buildPart } from './parts';

const kinds: CymbalKind[] = ['hi-hat', 'crash', 'ride', 'splash', 'china'];

function profileHeight(kind: CymbalKind): number {
  const points = createCymbalProfile(kind, 1);
  const heights = points.map((point) => point.y);
  return Math.max(...heights) - Math.min(...heights);
}

const minimumBowHeight: Readonly<Record<CymbalKind, number>> = {
  'hi-hat': 0.04,
  crash: 0.08,
  ride: 0.06,
  splash: 0.1,
  china: 0.04,
};

describe('lathed cymbal geometry', () => {
  it('defines recognisably different profiles for every cymbal type', () => {
    expect(CYMBAL_PROFILES.ride.bellRadius).toBeGreaterThan(CYMBAL_PROFILES.crash.bellRadius);
    expect(CYMBAL_PROFILES.ride.thickness).toBeGreaterThan(CYMBAL_PROFILES.crash.thickness);
    expect(CYMBAL_PROFILES.splash.bellHeight).toBeGreaterThan(CYMBAL_PROFILES.ride.bellHeight);
    expect(CYMBAL_PROFILES.china.edgeLift).toBeGreaterThan(0.08);
    expect(profileHeight('china')).toBeGreaterThan(profileHeight('hi-hat'));
  });

  it.each(kinds)('gives the %s a visibly formed bow rather than a flat plate', (kind) => {
    expect(CYMBAL_PROFILES[kind].bowHeight).toBeGreaterThanOrEqual(minimumBowHeight[kind]);
  });

  it.each(kinds)('creates a closed continuous %s cross-section', (kind) => {
    const radius = 0.55;
    const profile = createCymbalProfile(kind, radius);
    expect(profile).toHaveLength(60);
    expect(profile[0]).toEqual(profile.at(-1));
    expect(Math.min(...profile.map((point) => point.x))).toBeGreaterThan(0);
    expect(Math.max(...profile.map((point) => point.x))).toBeCloseTo(radius);
  });

  it.each(kinds)('creates finite normals, UVs and an appropriate budget for %s', (kind) => {
    const geometry = createCymbalGeometry(kind, 0.55);
    expect(geometry).toBeInstanceOf(THREE.LatheGeometry);
    expect(geometry.name).toBe(`${kind}-cymbal-lathed`);
    expect(geometry.userData.triangleCount).toBe(11_328);
    expect(geometry.userData.profilePointCount).toBe(60);
    expect(CYMBAL_ANGULAR_SEGMENTS).toBe(96);

    for (const attributeName of ['position', 'normal', 'uv']) {
      const attribute = geometry.getAttribute(attributeName) as THREE.BufferAttribute;
      expect(attribute.count, `${kind} ${attributeName}`).toBeGreaterThan(0);
      for (const value of attribute.array) expect(Number.isFinite(value), `${kind} ${attributeName}`).toBe(true);
    }
    const normals = geometry.getAttribute('normal') as THREE.BufferAttribute;
    for (let index = 0; index < normals.count; index += Math.max(1, Math.floor(normals.count / 40))) {
      const length = new THREE.Vector3(normals.getX(index), normals.getY(index), normals.getZ(index)).length();
      expect(length).toBeCloseTo(1, 4);
    }
  });

  it.each(kinds)('adds subtle deterministic rim irregularity to %s', (kind) => {
    const radius = 0.55;
    const first = createCymbalGeometry(kind, radius);
    const second = createCymbalGeometry(kind, radius);
    const firstPositions = first.getAttribute('position') as THREE.BufferAttribute;
    const secondPositions = second.getAttribute('position') as THREE.BufferAttribute;
    expect([...firstPositions.array]).toEqual([...secondPositions.array]);

    const rimRadii: number[] = [];
    for (let index = 0; index < firstPositions.count; index += 1) {
      const radial = Math.hypot(firstPositions.getX(index), firstPositions.getZ(index));
      if (radial > radius * 0.985) rimRadii.push(radial);
    }
    const variation = Math.max(...rimRadii) - Math.min(...rimRadii);
    expect(variation).toBeGreaterThan(radius * 0.001);
    expect(variation).toBeLessThan(radius * 0.02);
  });

  it('preserves catalogue size differences', () => {
    const small = createCymbalGeometry('crash', PART_BY_ID.get('crash-16')!.dimensions.radius);
    const large = createCymbalGeometry('crash', PART_BY_ID.get('crash-18')!.dimensions.radius);
    expect(small.boundingSphere?.radius).toBeLessThan(large.boundingSphere!.radius);
    expect(large.userData.nominalRadius).toBe(0.58);
  });

  it('keeps the arena preset within the cymbal polygon budget', () => {
    const arena = createPreset('arena');
    let cymbalSurfaces = 0;
    let triangles = 0;
    for (const item of arena.items) {
      const definition = PART_BY_ID.get(item.partId)!;
      if (definition.category !== 'Cymbals') continue;
      const model = buildPart(definition, item.finish);
      model.traverse((child) => {
        if (!(child instanceof THREE.Mesh) || !child.geometry.userData.cymbalKind) return;
        cymbalSurfaces += 1;
        triangles += child.geometry.userData.triangleCount as number;
      });
    }
    expect(cymbalSurfaces).toBe(6);
    expect(triangles).toBe(67_968);
    expect(triangles).toBeLessThan(70_000);
  });
});
