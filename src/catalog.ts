import type { PartCategory, PartDefinition } from './types';

export const CATEGORIES: Array<'All' | PartCategory> = ['All', 'Drums', 'Cymbals', 'Hardware', 'Seating'];

export const FINISHES = [
  { name: 'Amber', colour: '#c8782d' },
  { name: 'Crimson', colour: '#8f2f3a' },
  { name: 'Midnight', colour: '#202b3b' },
  { name: 'Marine', colour: '#235b70' },
  { name: 'Forest', colour: '#315e4b' },
  { name: 'Ivory', colour: '#ddd4c2' },
];

export const PARTS: PartDefinition[] = [
  { id: 'kick-22', name: 'Bass drum', category: 'Drums', kind: 'bass-drum', size: '22 × 18 in', description: 'Full-bodied centrepiece', accent: '#ce7d32', dimensions: { radius: 0.72, depth: 0.72, height: 0.72 } },
  { id: 'kick-20', name: 'Compact bass', category: 'Drums', kind: 'bass-drum', size: '20 × 16 in', description: 'Tighter studio footprint', accent: '#b7672d', dimensions: { radius: 0.64, depth: 0.64, height: 0.64 } },
  { id: 'snare-14', name: 'Snare drum', category: 'Drums', kind: 'snare', size: '14 × 6.5 in', description: 'Steel shell on tripod', accent: '#c7cbd1', dimensions: { radius: 0.44, depth: 0.23, height: 0.78 } },
  { id: 'tom-10', name: 'Rack tom', category: 'Drums', kind: 'rack-tom', size: '10 × 8 in', description: 'Fast, articulate voice', accent: '#d89043', dimensions: { radius: 0.32, depth: 0.29, height: 1.08 } },
  { id: 'tom-12', name: 'Rack tom', category: 'Drums', kind: 'rack-tom', size: '12 × 9 in', description: 'Versatile middle voice', accent: '#c8782d', dimensions: { radius: 0.38, depth: 0.33, height: 1.02 } },
  { id: 'tom-13', name: 'Large rack tom', category: 'Drums', kind: 'rack-tom', size: '13 × 10 in', description: 'Deeper melodic step', accent: '#ac5b25', dimensions: { radius: 0.42, depth: 0.37, height: 0.96 } },
  { id: 'floor-14', name: 'Floor tom', category: 'Drums', kind: 'floor-tom', size: '14 × 14 in', description: 'Compact low-end voice', accent: '#d89043', dimensions: { radius: 0.45, depth: 0.55, height: 0.7 } },
  { id: 'floor-16', name: 'Floor tom', category: 'Drums', kind: 'floor-tom', size: '16 × 16 in', description: 'Classic low-end thunder', accent: '#c8782d', dimensions: { radius: 0.51, depth: 0.62, height: 0.67 } },
  { id: 'hihat-14', name: 'Hi-hats', category: 'Cymbals', kind: 'hi-hat', size: '14 in', description: 'Matched pair with pedal', accent: '#c5a35a', dimensions: { radius: 0.45, depth: 0.05, height: 1.02 } },
  { id: 'crash-16', name: 'Crash cymbal', category: 'Cymbals', kind: 'crash', size: '16 in', description: 'Fast, bright accent', accent: '#d2ad57', dimensions: { radius: 0.52, depth: 0.04, height: 1.38 } },
  { id: 'crash-18', name: 'Large crash', category: 'Cymbals', kind: 'crash', size: '18 in', description: 'Broad, confident accent', accent: '#c99d45', dimensions: { radius: 0.58, depth: 0.04, height: 1.42 } },
  { id: 'ride-20', name: 'Ride cymbal', category: 'Cymbals', kind: 'ride', size: '20 in', description: 'Wide bow and clear bell', accent: '#d8b763', dimensions: { radius: 0.65, depth: 0.05, height: 1.24 } },
  { id: 'china-18', name: 'China cymbal', category: 'Cymbals', kind: 'china', size: '18 in', description: 'Upturned, explosive edge', accent: '#b99144', dimensions: { radius: 0.58, depth: 0.08, height: 1.52 } },
  { id: 'splash-10', name: 'Splash cymbal', category: 'Cymbals', kind: 'splash', size: '10 in', description: 'Quick punctuation', accent: '#d9bd77', dimensions: { radius: 0.32, depth: 0.03, height: 1.5 } },
  { id: 'stand-straight', name: 'Straight stand', category: 'Hardware', kind: 'straight-stand', size: 'Single-braced', description: 'Light cymbal stand', accent: '#9aa0a8', dimensions: { radius: 0.32, depth: 0.32, height: 1.42 } },
  { id: 'stand-boom', name: 'Boom stand', category: 'Hardware', kind: 'boom-stand', size: 'Counterweighted', description: 'Reach over busy setups', accent: '#aeb4ba', dimensions: { radius: 0.35, depth: 0.35, height: 1.5 } },
  { id: 'stand-snare', name: 'Snare stand', category: 'Hardware', kind: 'snare-stand', size: 'Double-braced', description: 'Adjustable basket', accent: '#979da5', dimensions: { radius: 0.34, depth: 0.34, height: 0.72 } },
  { id: 'pedal-double', name: 'Double pedal', category: 'Hardware', kind: 'double-pedal', size: 'Dual-chain', description: 'Twin pedal linkage', accent: '#7f8790', dimensions: { radius: 0.55, depth: 0.38, height: 0.35 } },
  { id: 'throne-round', name: 'Drum throne', category: 'Seating', kind: 'throne', size: 'Round top', description: 'Height-adjustable seat', accent: '#323843', dimensions: { radius: 0.38, depth: 0.38, height: 0.58 } },
];

export const PART_BY_ID = new Map(PARTS.map((part) => [part.id, part]));
