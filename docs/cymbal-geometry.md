# Procedural cymbal geometry

Drumland generates cymbals from closed two-dimensional cross-sections in `src/scene/cymbalGeometry.ts`. Three.js `LatheGeometry` revolves each profile around the vertical axis to make a continuous bell, bow, rim and centre-hole wall.

## Profiles

| Type | Character |
|---|---|
| Hi-hat | Compact bell, shallow bow and firm edge |
| Crash | Medium bell, flexible bow and gently falling edge |
| Ride | Large bell, flatter/heavier bow and thicker edge |
| Splash | Pronounced bell, steep flexible bow and thin edge |
| China | Compact bell, shallow bow and strongly upturned outer edge |

Each profile contains 60 cross-section points and uses 96 angular segments. The outer surface is rounded through the rim rather than joining separate bell, disc and torus meshes.

## Controlled irregularity

After lathing, deterministic low-amplitude harmonics deform the radius and rim height. The deformation is strongest at the edge and fades towards the centre hole. Depending on type, peak radial variation is approximately 0.15–0.52%; this is intended to break the computer-perfect silhouette without making the cymbal look damaged.

## Geometry budget

Each cymbal has 11,328 triangles. The arena preset contains six cymbal surfaces including the two hi-hat plates, totalling 67,968 cymbal triangles. Geometry contains no downloaded assets and retains the shared bronze material introduced in issue #4.

The production JavaScript bundle grows from 558.70 kB (142.51 kB gzip) to 563.70 kB (144.40 kB gzip): an increase of 5.00 kB, or 1.89 kB gzip. Geometry is generated at runtime and introduces no model download.
