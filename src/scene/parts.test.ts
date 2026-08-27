import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PARTS, PART_BY_ID } from '../catalog';
import { buildPart } from './parts';

function coloursIn(group: THREE.Group): string[] {
  const colours: string[] = [];
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if ('color' in material && material.color instanceof THREE.Color) colours.push(`#${material.color.getHexString()}`);
    }
  });
  return colours;
}

describe('procedural part models', () => {
  it('builds a visible model for every catalogue part', () => {
    for (const definition of PARTS) {
      const model = buildPart(definition, '#8f2f3a');
      const meshes: THREE.Mesh[] = [];
      model.traverse((child) => { if (child instanceof THREE.Mesh) meshes.push(child); });
      expect(meshes.length, definition.id).toBeGreaterThan(0);
      expect(meshes.every((part) => part.castShadow && part.receiveShadow), definition.id).toBe(true);
    }
  });

  it('applies the chosen finish to a snare shell', () => {
    const snare = PART_BY_ID.get('snare-14');
    expect(snare).toBeDefined();
    const model = buildPart(snare!, '#8f2f3a');
    expect(coloursIn(model)).toContain('#8f2f3a');
  });

  it('applies different selected finishes without mutating catalogue data', () => {
    const tom = PART_BY_ID.get('tom-12');
    expect(tom).toBeDefined();
    expect(coloursIn(buildPart(tom!, '#235b70'))).toContain('#235b70');
    expect(coloursIn(buildPart(tom!, '#315e4b'))).toContain('#315e4b');
    expect(tom?.accent).toBe('#c8782d');
  });

  it('applies every catalogue finish to every drum shell', () => {
    const finishes = ['#c8782d', '#8f2f3a', '#202b3b', '#235b70', '#315e4b', '#ddd4c2'];
    const drums = PARTS.filter((part) => part.category === 'Drums');
    for (const drum of drums) {
      for (const finish of finishes) {
        expect(coloursIn(buildPart(drum, finish)), `${drum.id} ${finish}`).toContain(finish);
      }
    }
  });

  it('reuses the central cymbal material between models', () => {
    const crash = buildPart(PART_BY_ID.get('crash-16')!, '#c8782d');
    const ride = buildPart(PART_BY_ID.get('ride-20')!, '#c8782d');
    const materialFrom = (group: THREE.Group): THREE.Material | undefined => {
      let found: THREE.Material | undefined;
      group.traverse((child) => {
        if (child instanceof THREE.Mesh && !Array.isArray(child.material) && child.material.name === 'cymbal-bronze') found = child.material;
      });
      return found;
    };
    expect(materialFrom(crash)).toBe(materialFrom(ride));
  });
});
