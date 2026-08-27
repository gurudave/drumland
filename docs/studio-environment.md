# Studio environment and rendering budget

Drumland uses a neutral, procedurally generated product-visualisation environment. A Three.js `RoomEnvironment` is filtered into a prefiltered mipmapped radiance environment map (PMREM) at startup and assigned to the scene. Chrome, lacquer and bronze therefore reflect broad soft-box shapes rather than relying only on direct lights.

## Lighting and colour

- ACES filmic tone mapping at exposure 1.0 protects bright bronze and chrome highlights.
- A warm shadow-casting key defines shape.
- A cool fill keeps dark hardware readable.
- A rear rim separates silhouettes from the dark stage.
- Low-intensity hemispherical light prevents blocked-up undersides.
- The default camera uses a 38° field of view, with separate tested home and top-view compositions.

The floor receives soft PCF shadows. Each part also has a small procedural radial contact shadow sized for its footprint; this provides stable grounding for pedals, shells and tripod-based parts even where thin feet do not occupy many shadow-map pixels. Contact shadows fade as parts are lifted from the floor.

## Adaptive quality

| Setting | High | Economy |
|---|---:|---:|
| Antialiasing | On | Off |
| Device-pixel-ratio cap | 2.0 | 1.25 |
| Key shadow map | 2048² | 1024² |
| PMREM face size | 256 | 128 |
| Contact-shadow opacity | 0.24 | 0.19 |

The economy path is selected when the browser reports no more than four logical processors, no more than 4 GB of device memory, or a narrow coarse-pointer display. It retains image-based reflections and contact grounding while reducing the main fill-rate and texture costs.

The half-float PMREM colour target occupies approximately 6 MiB on the high path and 1.5 MiB on the economy path, before implementation-dependent depth allocation. The shared 64² contact-shadow texture occupies 16 KiB before mipmaps.

## Asset provenance and licensing

No HDR image or other environment asset is downloaded. `RoomEnvironment` and `PMREMGenerator` are supplied by Three.js under the MIT licence; the generated lighting data exists only at runtime. The radial contact-shadow texture is original procedural project code. Consequently this feature adds zero environment-download bytes and requires no third-party image attribution.
