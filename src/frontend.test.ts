// @vitest-environment jsdom

import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { KitItem } from './types';

interface StudioCallbacks {
  onSelect: (id: string | null) => void;
  onTransformStart: () => void;
  onTransform: (item: KitItem) => void;
}

const studioMock = vi.hoisted(() => ({
  callbacks: null as StudioCallbacks | null,
  items: [] as KitItem[],
  selectedId: null as string | null,
  mode: 'translate',
  homeCalls: 0,
  topCalls: 0,
}));

vi.mock('./scene/Studio', () => ({
  Studio: class MockStudio {
    constructor(_canvas: HTMLCanvasElement, callbacks: StudioCallbacks) {
      void _canvas;
      studioMock.callbacks = callbacks;
    }

    sync(items: KitItem[], selectedId: string | null): void {
      studioMock.items = structuredClone(items);
      studioMock.selectedId = selectedId;
    }

    setMode(mode: 'translate' | 'rotate'): void { studioMock.mode = mode; }
    setSelection(_id: string | null): void { void _id; }
    homeView(): void { studioMock.homeCalls += 1; }
    topView(): void { studioMock.topCalls += 1; }
    dispose(): void { /* nothing to release in the test adapter */ }
  },
}));

function byId<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id}`);
  return found as T;
}

function click(target: Element): void {
  target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function change(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function partCard(name: string): HTMLElement {
  const card = [...document.querySelectorAll<HTMLElement>('.part-card')]
    .find((candidate) => candidate.querySelector('strong')?.textContent === name);
  if (!card) throw new Error(`Missing catalogue card ${name}`);
  return card;
}

describe('Drumland frontend behaviour', () => {
  beforeAll(async () => {
    localStorage.clear();
    const html = await import('../index.html?raw').then((module) => module.default);
    const body = html.match(/<body>([\s\S]*)<\/body>/)?.[1];
    if (!body) throw new Error('Could not load the application shell');
    document.body.innerHTML = body;
    await import('./main');

    click(partCard('Snare drum').querySelector('button')!);
    const snare = studioMock.items.find((item) => item.partId === 'snare-14');
    if (!snare) throw new Error('The snare was not added');
    studioMock.callbacks?.onSelect(snare.id);
  });

  it('filters the catalogue without losing editor state', () => {
    const cymbalsTab = [...document.querySelectorAll<HTMLButtonElement>('.category-tab')]
      .find((button) => button.textContent === 'Cymbals');
    expect(cymbalsTab).toBeDefined();
    click(cymbalsTab!);
    expect(document.querySelectorAll('.part-card')).toHaveLength(6);
    expect(studioMock.items.some((item) => item.partId === 'snare-14')).toBe(true);
  });

  it('changes the selected snare finish and sends it to the 3D scene', () => {
    expect(byId<HTMLElement>('inspector').hidden).toBe(false);
    const crimson = document.querySelector<HTMLButtonElement>('.finish-swatch[title="Crimson"]');
    expect(crimson).not.toBeNull();
    click(crimson!);
    expect(studioMock.items.find((item) => item.partId === 'snare-14')?.finish).toBe('#8f2f3a');
  });

  it('allows independent X, Y and Z angle changes', () => {
    const x = document.getElementById('rotation-x') as HTMLInputElement | null;
    const y = document.getElementById('rotation-y') as HTMLInputElement | null;
    const z = document.getElementById('rotation-z') as HTMLInputElement | null;
    expect(x, 'X tilt control').not.toBeNull();
    expect(y, 'Y rotation control').not.toBeNull();
    expect(z, 'Z tilt control').not.toBeNull();
    if (!x || !y || !z) return;
    change(x, '15');
    change(y, '-30');
    change(z, '8');
    const rotation = studioMock.items.find((item) => item.partId === 'snare-14')?.rotation;
    expect(rotation?.[0]).toBeCloseTo(Math.PI / 12);
    expect(rotation?.[1]).toBeCloseTo(-Math.PI / 6);
    expect(rotation?.[2]).toBeCloseTo(8 * Math.PI / 180);
  });

  it('accepts 3D gizmo transforms without losing the selected finish', () => {
    const snare = studioMock.items.find((item) => item.partId === 'snare-14');
    expect(snare).toBeDefined();
    studioMock.callbacks?.onSelect(snare!.id);
    studioMock.callbacks?.onTransformStart();
    studioMock.callbacks?.onTransform({
      ...snare!,
      position: [0.4, 0.1, -0.2],
      rotation: [0.1, 0.2, 0.3],
      scale: 1.1,
      finish: '#ffffff',
    });
    const saved = JSON.parse(localStorage.getItem('drumland-kit-v1') ?? '{}') as { items?: KitItem[] };
    const transformed = saved.items?.find((item) => item.id === snare!.id);
    expect(transformed?.position).toEqual([0.4, 0.1, -0.2]);
    expect(transformed?.rotation).toEqual([0.1, 0.2, 0.3]);
    expect(transformed?.scale).toBe(1.1);
    expect(transformed?.finish).toBe('#8f2f3a');
  });

  it('updates exact position and scale, then centres the part', () => {
    change(byId<HTMLInputElement>('position-x'), '1.25');
    change(byId<HTMLInputElement>('position-y'), '0.2');
    change(byId<HTMLInputElement>('position-z'), '-0.75');
    change(byId<HTMLInputElement>('part-scale'), '125');
    let snare = studioMock.items.find((item) => item.partId === 'snare-14');
    expect(snare?.position).toEqual([1.25, 0.2, -0.75]);
    expect(snare?.scale).toBe(1.25);
    click(byId('centre-part'));
    snare = studioMock.items.find((item) => item.partId === 'snare-14');
    expect(snare?.position).toEqual([0, 0.2, 0]);
  });

  it('duplicates, deletes, undoes and redoes editor changes', () => {
    const before = studioMock.items.length;
    click(byId('duplicate-part'));
    expect(studioMock.items).toHaveLength(before + 1);
    expect(studioMock.selectedId).not.toBeNull();
    click(byId('delete-part'));
    expect(studioMock.items).toHaveLength(before);
    click(byId('undo'));
    expect(studioMock.items).toHaveLength(before + 1);
    click(byId('redo'));
    expect(studioMock.items).toHaveLength(before);
  });

  it('loads a preset and persists the renamed kit', () => {
    const preset = byId<HTMLSelectElement>('preset-select');
    preset.value = 'minimal';
    click(byId('load-preset'));
    expect(studioMock.items.length).toBeGreaterThan(5);
    const name = byId<HTMLInputElement>('kit-name');
    change(name, 'Dave’s compact kit');
    click(byId('save-kit'));
    const saved = JSON.parse(localStorage.getItem('drumland-kit-v1') ?? '{}') as { name?: string };
    expect(saved.name).toBe('Dave’s compact kit');
  });

  it('switches editing and camera tools', () => {
    click(byId('tool-rotate'));
    expect(studioMock.mode).toBe('rotate');
    click(byId('tool-move'));
    expect(studioMock.mode).toBe('translate');
    click(byId('view-home'));
    click(byId('view-top'));
    expect(studioMock.homeCalls).toBe(1);
    expect(studioMock.topCalls).toBe(1);
  });

  it('imports a valid kit file and rejects malformed input', async () => {
    const input = byId<HTMLInputElement>('import-file');
    const validKit = {
      version: 1,
      name: 'Imported test kit',
      updatedAt: new Date().toISOString(),
      items: [],
    };
    Object.defineProperty(input, 'files', { configurable: true, value: [{ text: async () => JSON.stringify(validKit) }] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() => expect(byId<HTMLInputElement>('kit-name').value).toBe('Imported test kit'));

    Object.defineProperty(input, 'files', { configurable: true, value: [{ text: async () => 'not json' }] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() => expect(byId('toast').textContent).toMatch(/import/i));
  });
});
