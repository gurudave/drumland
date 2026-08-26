export type PartCategory = 'Drums' | 'Cymbals' | 'Hardware' | 'Seating';

export type PartKind =
  | 'bass-drum'
  | 'snare'
  | 'rack-tom'
  | 'floor-tom'
  | 'hi-hat'
  | 'crash'
  | 'ride'
  | 'china'
  | 'splash'
  | 'straight-stand'
  | 'boom-stand'
  | 'snare-stand'
  | 'throne'
  | 'double-pedal';

export interface PartDefinition {
  id: string;
  name: string;
  category: PartCategory;
  kind: PartKind;
  size: string;
  description: string;
  accent: string;
  dimensions: { radius: number; depth: number; height: number };
}

export interface KitItem {
  id: string;
  partId: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  finish: string;
}

export interface KitDocument {
  version: 1;
  name: string;
  updatedAt: string;
  items: KitItem[];
}
