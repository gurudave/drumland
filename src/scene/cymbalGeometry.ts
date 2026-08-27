import * as THREE from 'three';
import type { PartKind } from '../types';

export type CymbalKind = Extract<PartKind, 'hi-hat' | 'crash' | 'ride' | 'china' | 'splash'>;

export interface CymbalProfileSpec {
  bellRadius: number;
  bellHeight: number;
  bowHeight: number;
  bowPower: number;
  edgeLift: number;
  edgeLiftStart: number;
  thickness: number;
  deformation: number;
  lobes: number;
}

export const CYMBAL_PROFILES: Readonly<Record<CymbalKind, CymbalProfileSpec>> = {
  'hi-hat': { bellRadius: 0.18, bellHeight: 0.058, bowHeight: 0.045, bowPower: 0.85, edgeLift: -0.008, edgeLiftStart: 0.82, thickness: 0.011, deformation: 0.0018, lobes: 5 },
  crash: { bellRadius: 0.19, bellHeight: 0.07, bowHeight: 0.09, bowPower: 0.68, edgeLift: -0.016, edgeLiftStart: 0.78, thickness: 0.009, deformation: 0.0032, lobes: 5 },
  ride: { bellRadius: 0.235, bellHeight: 0.093, bowHeight: 0.065, bowPower: 0.95, edgeLift: -0.006, edgeLiftStart: 0.84, thickness: 0.014, deformation: 0.0015, lobes: 7 },
  splash: { bellRadius: 0.205, bellHeight: 0.097, bowHeight: 0.11, bowPower: 0.55, edgeLift: -0.024, edgeLiftStart: 0.7, thickness: 0.008, deformation: 0.0035, lobes: 3 },
  china: { bellRadius: 0.175, bellHeight: 0.075, bowHeight: 0.045, bowPower: 0.95, edgeLift: 0.135, edgeLiftStart: 0.72, thickness: 0.01, deformation: 0.004, lobes: 5 },
};

const PROFILE_SEGMENTS = 28;
export const CYMBAL_ANGULAR_SEGMENTS = 96;

function smoothstep(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function centreLine(spec: CymbalProfileSpec, radius: number, radialPosition: number): number {
  const normalised = radialPosition / radius;
  if (normalised <= spec.bellRadius) {
    const bellProgress = smoothstep(normalised / spec.bellRadius);
    return radius * (spec.bowHeight + spec.bellHeight * (1 - bellProgress));
  }
  const bowProgress = (normalised - spec.bellRadius) / (1 - spec.bellRadius);
  const bow = spec.bowHeight * Math.pow(1 - bowProgress, spec.bowPower);
  const edgeProgress = smoothstep((normalised - spec.edgeLiftStart) / (1 - spec.edgeLiftStart));
  return radius * (bow + spec.edgeLift * edgeProgress);
}

export function createCymbalProfile(kind: CymbalKind, radius: number): THREE.Vector2[] {
  const spec = CYMBAL_PROFILES[kind];
  const holeRadius = Math.max(0.012, radius * 0.035);
  const halfThickness = Math.max(0.002, radius * spec.thickness) / 2;
  const roundedOuterRadius = radius - halfThickness * 0.35;
  const underside: THREE.Vector2[] = [];
  const top: THREE.Vector2[] = [];

  for (let index = 0; index <= PROFILE_SEGMENTS; index += 1) {
    const progress = index / PROFILE_SEGMENTS;
    const radialPosition = THREE.MathUtils.lerp(holeRadius, roundedOuterRadius, progress);
    const height = centreLine(spec, radius, radialPosition);
    underside.push(new THREE.Vector2(radialPosition, height - halfThickness));
    top.unshift(new THREE.Vector2(radialPosition, height + halfThickness));
  }

  const edgeHeight = centreLine(spec, radius, radius);
  const profile = [
    ...underside,
    new THREE.Vector2(radius, edgeHeight),
    ...top,
    underside[0].clone(),
  ];
  return profile;
}

function deformSilhouette(geometry: THREE.BufferGeometry, kind: CymbalKind, radius: number): void {
  const spec = CYMBAL_PROFILES[kind];
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const phase = spec.lobes * 0.37;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const radialPosition = Math.sqrt(x * x + z * z);
    const normalisedRadius = Math.min(1, radialPosition / radius);
    const angle = Math.atan2(z, x);
    const rimInfluence = Math.pow(smoothstep((normalisedRadius - 0.12) / 0.88), 2);
    const wave = Math.sin(angle * spec.lobes + phase) + Math.sin(angle * (spec.lobes + 4) - phase) * 0.36;
    const radialScale = 1 + spec.deformation * wave * rimInfluence;
    const verticalWarp = radius * spec.deformation * 0.32 * Math.sin(angle * (spec.lobes - 2) + phase) * Math.pow(normalisedRadius, 3);
    positions.setXYZ(index, x * radialScale, y + verticalWarp, z * radialScale);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

export function createCymbalGeometry(kind: CymbalKind, radius: number): THREE.LatheGeometry {
  const profile = createCymbalProfile(kind, radius);
  const geometry = new THREE.LatheGeometry(profile, CYMBAL_ANGULAR_SEGMENTS, 0, Math.PI * 2);
  deformSilhouette(geometry, kind, radius);
  geometry.name = `${kind}-cymbal-lathed`;
  geometry.userData.cymbalKind = kind;
  geometry.userData.nominalRadius = radius;
  geometry.userData.profilePointCount = profile.length;
  geometry.userData.triangleCount = geometry.index ? geometry.index.count / 3 : geometry.getAttribute('position').count / 3;
  return geometry;
}
