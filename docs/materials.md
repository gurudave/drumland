# Drumland material library

Drumland's part materials are centralised in `src/scene/materials.ts`. All surface textures are deterministic procedural `DataTexture` objects generated in the browser; the project currently downloads no external texture assets.

## Material classes

| Class | Surface cues |
|---|---|
| Lacquered wood | Clearcoat, subtle repeated grain, small roughness variation |
| Sparkle wrap | Clearcoat, sparse metallic flecks, normal and roughness variation |
| Pearl wrap | Clearcoat, mild iridescence and broad roughness waves |
| Chrome | High metalness, low roughness and strong environment response |
| Dark chrome | Slightly rougher, darker reflective metal |
| Cymbal bronze | Concentric lathe marks and deterministic hammered normals |
| Drumhead polymer | Translucency, surface wear and optional centre mark |
| Rubber | High roughness with fine variation |
| Felt | Fully rough fibrous normal texture |

Finish colours select a shell surface without duplicating any texture data. Unknown/custom colours default to lacquer.

## Colour space and filtering

- Colour textures use `SRGBColorSpace`.
- Roughness, bump and normal textures use `NoColorSpace`.
- Procedural textures use linear filtering, generated mipmaps and anisotropy level 4.
- Repeating shell textures use `RepeatWrapping`; cymbal radial maps use `ClampToEdgeWrapping`.

## Asset provenance and licensing

There are no third-party texture assets. The texture generators and resulting pixel data are original project code under the repository's licence. If external assets are added later, their source, licence and attribution must be recorded here.

## Resource budget

The current library generates 11 RGBA8 textures:

- Raw texture pixels: 1,015,808 bytes (approximately 0.97 MiB)
- Estimated GPU allocation including mipmaps: 1,354,411 bytes (approximately 1.29 MiB)
- External texture download: 0 bytes
- Production JavaScript before this library: 554.81 kB (140.93 kB gzip)
- Production JavaScript with this library: 558.70 kB (142.51 kB gzip)
- Material-library bundle increase: 3.89 kB (1.58 kB gzip)

`getMaterialLibraryStats()` calculates these values from the registered texture data so tests can detect accidental growth. Material parameter and shader-program memory is renderer-dependent and is not included.
