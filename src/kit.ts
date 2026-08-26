import { FINISHES, PART_BY_ID } from './catalog';
import type { KitDocument, KitItem } from './types';

export function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `part-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createItem(partId: string, index = 0): KitItem {
  if (!PART_BY_ID.has(partId)) throw new Error(`Unknown part: ${partId}`);
  const ring = Math.floor(index / 8) + 1;
  const angle = index * 2.3;
  return {
    id: createId(),
    partId,
    position: [Number((Math.sin(angle) * ring * 0.42).toFixed(2)), 0, Number((Math.cos(angle) * ring * 0.32).toFixed(2))],
    rotation: [0, 0, 0],
    scale: 1,
    finish: FINISHES[index % FINISHES.length].colour,
  };
}

export function emptyKit(name = 'My dream kit'): KitDocument {
  return { version: 1, name, updatedAt: new Date().toISOString(), items: [] };
}

function isTuple3(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every((part) => typeof part === 'number' && Number.isFinite(part));
}

export function parseKit(value: unknown): KitDocument {
  if (!value || typeof value !== 'object') throw new Error('The file does not contain a kit.');
  const input = value as Partial<KitDocument>;
  if (input.version !== 1 || !Array.isArray(input.items)) throw new Error('This kit format is not supported.');
  const items = input.items.map((candidate, index) => {
    if (!candidate || typeof candidate !== 'object') throw new Error(`Part ${index + 1} is invalid.`);
    const item = candidate as Partial<KitItem>;
    if (typeof item.partId !== 'string' || !PART_BY_ID.has(item.partId)) throw new Error(`Part ${index + 1} is not in the catalogue.`);
    if (!isTuple3(item.position) || !isTuple3(item.rotation)) throw new Error(`Part ${index + 1} has invalid coordinates.`);
    return {
      id: typeof item.id === 'string' ? item.id : createId(),
      partId: item.partId,
      position: [
        Math.max(-20, Math.min(20, item.position[0])),
        Math.max(0, Math.min(20, item.position[1])),
        Math.max(-20, Math.min(20, item.position[2])),
      ] as [number, number, number],
      rotation: item.rotation,
      scale: typeof item.scale === 'number' ? Math.max(0.4, Math.min(2, item.scale)) : 1,
      finish: typeof item.finish === 'string' && /^#[0-9a-f]{6}$/i.test(item.finish) ? item.finish : FINISHES[0].colour,
    };
  });
  return {
    version: 1,
    name: typeof input.name === 'string' ? input.name.slice(0, 48) : 'Imported kit',
    updatedAt: new Date().toISOString(),
    items,
  };
}

type PresetEntry = [string, number, number, number, string?];

const PRESET_DATA: Record<string, PresetEntry[]> = {
  studio: [
    ['kick-22', 0, 0.3, 0], ['snare-14', -0.76, 0.08, 0], ['tom-10', -0.28, 0.18, 0.08],
    ['tom-12', 0.35, 0.2, -0.08], ['floor-16', 0.92, 0.1, 0], ['hihat-14', -1.25, 0.12, 0],
    ['crash-16', -1.15, 0.65, -0.15], ['ride-20', 1.25, 0.62, 0.18], ['throne-round', 0, -1.08, 0],
  ],
  arena: [
    ['kick-22', -0.45, 0.35, 0], ['kick-22', 0.45, 0.35, 0], ['snare-14', -0.75, -0.12, 0],
    ['tom-10', -0.65, 0.35, 0.12], ['tom-12', 0, 0.38, 0], ['tom-13', 0.65, 0.35, -0.12],
    ['floor-14', -1.1, 0.25, 0], ['floor-16', 1.12, 0.22, 0], ['hihat-14', -1.35, -0.22, 0],
    ['crash-18', -1.4, 0.75, -0.18], ['ride-20', 1.45, 0.72, 0.2], ['china-18', 0.8, 1.1, 0],
    ['splash-10', -0.2, 0.95, 0], ['throne-round', 0, -1.2, 0], ['pedal-double', 0, -0.12, 0],
  ],
  minimal: [
    ['kick-20', 0, 0.3, 0, '#315e4b'], ['snare-14', -0.72, 0.02, 0], ['tom-12', 0.25, 0.22, 0, '#315e4b'],
    ['floor-14', 0.9, 0.08, 0, '#315e4b'], ['hihat-14', -1.15, 0.05, 0], ['ride-20', 1.22, 0.55, 0],
    ['throne-round', 0, -1, 0],
  ],
};

export function createPreset(name: string): KitDocument {
  const entries = PRESET_DATA[name] ?? PRESET_DATA.studio;
  const label = name === 'arena' ? 'Arena double-bass' : name === 'minimal' ? 'Minimal jazz' : 'Studio five-piece';
  return {
    version: 1,
    name: label,
    updatedAt: new Date().toISOString(),
    items: entries.map(([partId, x, z, rotation, finish], index) => ({
      ...createItem(partId, index),
      position: [x, 0, z],
      rotation: [0, rotation, 0],
      finish: finish ?? (PART_BY_ID.get(partId)?.category === 'Drums' ? '#c8782d' : FINISHES[index % FINISHES.length].colour),
    })),
  };
}
