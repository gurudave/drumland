import { describe, expect, it } from 'vitest';
import { createItem, createPreset, emptyKit, parseKit } from './kit';

describe('kit document', () => {
  it('creates catalogue items with safe defaults', () => {
    const item = createItem('kick-22');
    expect(item.partId).toBe('kick-22');
    expect(item.position).toHaveLength(3);
    expect(item.scale).toBe(1);
  });

  it('rejects unknown catalogue parts on import', () => {
    const kit = emptyKit();
    kit.items.push({ ...createItem('kick-22'), partId: 'time-machine' });
    expect(() => parseKit(kit)).toThrow(/catalogue/);
  });

  it('clamps imported positions and scales', () => {
    const kit = emptyKit();
    kit.items.push({ ...createItem('snare-14'), position: [99, -99, 4], scale: 9 });
    const parsed = parseKit(kit);
    expect(parsed.items[0].position).toEqual([20, 0, 4]);
    expect(parsed.items[0].scale).toBe(2);
  });

  it('builds each starter preset from known parts', () => {
    for (const preset of ['studio', 'arena', 'minimal']) {
      const kit = createPreset(preset);
      expect(kit.items.length).toBeGreaterThan(5);
      expect(() => parseKit(kit)).not.toThrow();
    }
  });
});
