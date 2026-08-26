import './style.css';
import { CATEGORIES, FINISHES, PARTS, PART_BY_ID } from './catalog';
import { createItem, createPreset, emptyKit, parseKit } from './kit';
import { Studio } from './scene/Studio';
import type { KitDocument, KitItem, PartCategory } from './types';

const STORAGE_KEY = 'drumland-kit-v1';

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element #${id}`);
  return found as T;
}

function cloneDocument(document: KitDocument): KitDocument {
  return structuredClone(document);
}

function loadLocalKit(): KitDocument {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseKit(JSON.parse(stored)) : emptyKit();
  } catch {
    return emptyKit();
  }
}

let kit = loadLocalKit();
let selectedId: string | null = null;
let category: 'All' | PartCategory = 'All';
let history: KitDocument[] = [];
let future: KitDocument[] = [];
let toastTimer = 0;
let transformSnapshotTaken = false;

const canvas = element<HTMLCanvasElement>('stage');
const catalog = element<HTMLDivElement>('catalog');
const categoryTabs = element<HTMLDivElement>('category-tabs');
const inspector = element<HTMLDivElement>('inspector');
const inspectorEmpty = element<HTMLDivElement>('inspector-empty');
const kitName = element<HTMLInputElement>('kit-name');

const studio = new Studio(canvas, {
  onSelect: (id) => {
    selectedId = id;
    render();
  },
  onTransformStart: () => {
    if (!transformSnapshotTaken) {
      pushHistory();
      transformSnapshotTaken = true;
      window.addEventListener('pointerup', () => { transformSnapshotTaken = false; }, { once: true });
    }
  },
  onTransform: (changed) => {
    const current = kit.items.find((item) => item.id === changed.id);
    if (!current) return;
    current.position = changed.position;
    current.rotation = changed.rotation;
    current.scale = changed.scale;
    touchAndSave();
    renderInspector(current);
  },
});

function pushHistory(): void {
  history.push(cloneDocument(kit));
  if (history.length > 60) history.shift();
  future = [];
}

function commit(mutator: (draft: KitDocument) => void): void {
  pushHistory();
  mutator(kit);
  touchAndSave();
  render();
}

function touchAndSave(): void {
  kit.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(kit));
}

function selectedItem(): KitItem | undefined {
  return kit.items.find((item) => item.id === selectedId);
}

function addPart(partId: string): void {
  let added: KitItem | undefined;
  commit((draft) => {
    added = createItem(partId, draft.items.length);
    draft.items.push(added);
  });
  selectedId = added?.id ?? null;
  render();
  const name = PART_BY_ID.get(partId)?.name ?? 'Part';
  showToast(`${name} added to the stage`);
}

function deleteSelected(): void {
  const item = selectedItem();
  if (!item) return;
  commit((draft) => { draft.items = draft.items.filter((candidate) => candidate.id !== item.id); });
  selectedId = null;
  render();
  showToast('Part removed');
}

function duplicateSelected(): void {
  const item = selectedItem();
  if (!item) return;
  let copy: KitItem | undefined;
  commit((draft) => {
    copy = createItem(item.partId, draft.items.length);
    copy.finish = item.finish;
    copy.scale = item.scale;
    copy.rotation = [...item.rotation];
    copy.position = [item.position[0] + 0.28, item.position[1], item.position[2] + 0.28];
    draft.items.push(copy);
  });
  selectedId = copy?.id ?? null;
  render();
  showToast('Part duplicated');
}

function undo(): void {
  const previous = history.pop();
  if (!previous) return;
  future.push(cloneDocument(kit));
  kit = previous;
  if (selectedId && !selectedItem()) selectedId = null;
  touchAndSave();
  render();
}

function redo(): void {
  const next = future.pop();
  if (!next) return;
  history.push(cloneDocument(kit));
  kit = next;
  if (selectedId && !selectedItem()) selectedId = null;
  touchAndSave();
  render();
}

function renderCatalog(): void {
  categoryTabs.replaceChildren(...CATEGORIES.map((name) => {
    const button = document.createElement('button');
    button.className = `category-tab${category === name ? ' active' : ''}`;
    button.textContent = name;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', String(category === name));
    button.addEventListener('click', () => { category = name; renderCatalog(); });
    return button;
  }));

  const visibleParts = PARTS.filter((part) => category === 'All' || part.category === category);
  element<HTMLSpanElement>('catalog-count').textContent = String(visibleParts.length);
  catalog.replaceChildren(...visibleParts.map((part) => {
    const card = document.createElement('article');
    card.className = 'part-card';
    card.innerHTML = `
      <span class="part-orb" style="--accent:${part.accent}"><i>${part.category[0]}</i></span>
      <span class="part-copy"><strong>${part.name}</strong><small>${part.size} · ${part.description}</small></span>
      <button class="add-button" aria-label="Add ${part.name}" title="Add ${part.name}">+</button>`;
    card.querySelector('button')?.addEventListener('click', () => addPart(part.id));
    card.addEventListener('dblclick', () => addPart(part.id));
    return card;
  }));
}

function renderInspector(item = selectedItem()): void {
  inspector.hidden = !item;
  inspectorEmpty.hidden = Boolean(item);
  if (!item) return;
  const definition = PART_BY_ID.get(item.partId);
  if (!definition) return;
  element('selected-swatch').style.background = item.finish;
  element('selected-category').textContent = definition.category.toUpperCase();
  element('selected-name').textContent = `${definition.name} · ${definition.size}`;
  element<HTMLInputElement>('position-x').value = item.position[0].toFixed(2);
  element<HTMLInputElement>('position-y').value = item.position[1].toFixed(2);
  element<HTMLInputElement>('position-z').value = item.position[2].toFixed(2);
  const degrees = Math.round(THREE_RAD_TO_DEG * item.rotation[1]);
  element<HTMLInputElement>('rotation-y').value = String(degrees);
  element<HTMLOutputElement>('rotation-output').value = `${degrees}°`;
  element<HTMLInputElement>('part-scale').value = String(Math.round(item.scale * 100));
  element<HTMLOutputElement>('scale-output').value = `${Math.round(item.scale * 100)}%`;

  const finishes = element<HTMLDivElement>('finish-options');
  finishes.replaceChildren(...FINISHES.map((finish) => {
    const button = document.createElement('button');
    button.className = `finish-swatch${item.finish.toLowerCase() === finish.colour ? ' active' : ''}`;
    button.style.background = finish.colour;
    button.title = finish.name;
    button.setAttribute('aria-label', finish.name);
    button.addEventListener('click', () => commit((draft) => {
      const target = draft.items.find((candidate) => candidate.id === item.id);
      if (target) target.finish = finish.colour;
    }));
    return button;
  }));
}

const THREE_RAD_TO_DEG = 180 / Math.PI;
const THREE_DEG_TO_RAD = Math.PI / 180;

function render(): void {
  studio.sync(kit.items, selectedId);
  kitName.value = kit.name;
  renderInspector();
  const empty = kit.items.length === 0;
  element('empty-stage').classList.toggle('hidden', !empty);
  element('part-total').textContent = `${kit.items.length} ${kit.items.length === 1 ? 'PART' : 'PARTS'}`;
  element<HTMLButtonElement>('undo').disabled = history.length === 0;
  element<HTMLButtonElement>('redo').disabled = future.length === 0;
}

function bindNumberInput(id: string, axis: 0 | 1 | 2): void {
  element<HTMLInputElement>(id).addEventListener('change', (event) => {
    const value = Number((event.target as HTMLInputElement).value);
    const item = selectedItem();
    if (!item || !Number.isFinite(value)) return renderInspector();
    commit((draft) => {
      const target = draft.items.find((candidate) => candidate.id === item.id);
      if (target) target.position[axis] = axis === 1 ? Math.max(0, value) : Math.max(-10, Math.min(10, value));
    });
  });
}

function showToast(message: string): void {
  const toast = element('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 2200);
}

function exportKit(): void {
  const blob = new Blob([JSON.stringify(kit, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${kit.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'drum-kit'}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Kit exported');
}

bindNumberInput('position-x', 0);
bindNumberInput('position-y', 1);
bindNumberInput('position-z', 2);

element<HTMLInputElement>('rotation-y').addEventListener('change', (event) => {
  const item = selectedItem();
  const value = Number((event.target as HTMLInputElement).value);
  if (item) commit((draft) => {
    const target = draft.items.find((candidate) => candidate.id === item.id);
    if (target) target.rotation[1] = value * THREE_DEG_TO_RAD;
  });
});
element<HTMLInputElement>('rotation-y').addEventListener('input', (event) => {
  element<HTMLOutputElement>('rotation-output').value = `${(event.target as HTMLInputElement).value}°`;
});
element<HTMLInputElement>('part-scale').addEventListener('change', (event) => {
  const item = selectedItem();
  const value = Number((event.target as HTMLInputElement).value) / 100;
  if (item) commit((draft) => {
    const target = draft.items.find((candidate) => candidate.id === item.id);
    if (target) target.scale = value;
  });
});
element<HTMLInputElement>('part-scale').addEventListener('input', (event) => {
  element<HTMLOutputElement>('scale-output').value = `${(event.target as HTMLInputElement).value}%`;
});

kitName.addEventListener('change', () => commit((draft) => { draft.name = kitName.value.trim() || 'Untitled kit'; }));
element('undo').addEventListener('click', undo);
element('redo').addEventListener('click', redo);
element('delete-part').addEventListener('click', deleteSelected);
element('duplicate-part').addEventListener('click', duplicateSelected);
element('centre-part').addEventListener('click', () => {
  const item = selectedItem();
  if (item) commit((draft) => {
    const target = draft.items.find((candidate) => candidate.id === item.id);
    if (target) target.position = [0, target.position[1], 0];
  });
});
element('view-home').addEventListener('click', () => studio.homeView());
element('view-top').addEventListener('click', () => studio.topView());
element('export-kit').addEventListener('click', exportKit);
element('save-kit').addEventListener('click', () => { touchAndSave(); showToast('Kit saved in this browser'); });
element('import-kit').addEventListener('click', () => element<HTMLInputElement>('import-file').click());
element<HTMLInputElement>('import-file').addEventListener('change', async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const imported = parseKit(JSON.parse(await file.text()));
    pushHistory();
    kit = imported;
    selectedId = null;
    touchAndSave();
    render();
    showToast('Kit imported');
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Could not import that kit');
  }
  (event.target as HTMLInputElement).value = '';
});
element('load-preset').addEventListener('click', () => {
  pushHistory();
  kit = createPreset(element<HTMLSelectElement>('preset-select').value);
  selectedId = null;
  touchAndSave();
  render();
  showToast('Preset loaded');
});

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-tool]')) {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-tool]').forEach((candidate) => candidate.classList.remove('active'));
    button.classList.add('active');
    studio.setMode(button.dataset.tool as 'translate' | 'rotate');
  });
}

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    if (event.shiftKey) redo(); else undo();
  } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
    event.preventDefault();
    duplicateSelected();
  } else if (event.key === 'Delete' || event.key === 'Backspace') {
    deleteSelected();
  } else if (event.key.toLowerCase() === 'w') {
    element<HTMLButtonElement>('tool-move').click();
  } else if (event.key.toLowerCase() === 'e') {
    element<HTMLButtonElement>('tool-rotate').click();
  } else if (event.key === 'Escape') {
    selectedId = null;
    render();
  }
});

window.addEventListener('beforeunload', () => studio.dispose());
renderCatalog();
render();
