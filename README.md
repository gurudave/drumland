# Drumland

A browser-based 3D workspace for designing a dream drum kit. Drumland uses procedural WebGL models, so every part is quick to load and ready to become more configurable over time.

## What the first version can do

- Add drums, cymbals, stands, pedals and seating from a filterable catalogue
- Select, move, rotate, scale, duplicate and recolour parts
- Orbit, pan, zoom and switch to a top-down view
- Start from studio, arena or minimal-jazz kit presets
- Undo and redo edits
- Save automatically in the browser
- Import and export portable JSON kit files
- Deploy as a static app on GitHub Pages

Sound playback is deliberately outside this first milestone. The catalogue and saved-kit schema give each item a stable part identity, ready for sample mappings and velocity layers later.

## Run locally

```bash
npm install
npm run dev
```

Then open the local address printed by Vite.

## Check a change

```bash
npm test
npm run build
```

## Controls

- Click a catalogue `+` to add a part
- Click a part to select it
- `W` switches to move mode; `E` switches to rotate mode
- `Delete` removes the selection
- `Ctrl/Cmd + D` duplicates it
- Double-click a part to focus the camera
- Drag the stage to orbit; right-drag to pan; scroll to zoom

## Deployment

The Pages workflow builds and tests every push to `main`, then publishes `dist`. In the repository settings, set **Pages → Source** to **GitHub Actions** if it is not already selected.

## Technical shape

- TypeScript and Vite
- Three.js with orbit and transform controls
- Procedural part geometry; no model or texture downloads
- Versioned JSON document format and local browser persistence

## Likely next milestones

1. Adjustable shell diameters, depths, cymbal angles and stand heights
2. Collision hints and player-reach overlays
3. Named manufacturers and asset-backed high-detail models
4. Shareable kit links or accounts
5. Multi-velocity audio samples, MIDI input and audition mode
