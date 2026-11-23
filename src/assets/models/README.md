# Models

Drop a glTF binary (`.glb`) named after a slot here and the game uses it in place of its own
procedural model. Remove the file to go back. The build finds files by itself
(`src/game/rendering/models/modelLibrary.ts`).

| Slot       | File         | Height | Clips used            |
| ---------- | ------------ | ------ | --------------------- |
| The Warden | `warden.glb` | 1.7 m  | `Idle`, `Walk`, `Run` |

More slots (Emberlings, beasts, relics) are added in `MODEL_SLOTS` as models arrive.

## Making a model

- **Up is +Y, the model faces +Z**, feet on the ground. Blender's glTF exporter does this by
  default ("+Y Up" on) if the character faces Blender's -Y (front view).
- **Size does not matter**: the game scales each model to its slot's height and stands it on the
  ground at its centre.
- **Animations** are picked by name, ignoring case: one containing `idle` (or `stand`), one
  containing `walk`, one containing `run` (or `jog`, `sprint`). Any may be missing: a walk alone
  plays at every speed, frozen when standing. Loop them; they cross-fade with speed.
- **Keep it light**: a few thousand triangles and one or two 1024px textures per character.
  Compress before adding it:

  ```sh
  npx @gltf-transform/cli optimize in.glb src/assets/models/warden.glb --compress meshopt --texture-compress webp
  ```

  Meshopt compression is decoded by the game; Draco is not.

Free, CC0 starting points: [Kenney](https://kenney.nl/assets?q=3d) and
[Quaternius](https://quaternius.com) (animated characters with Idle/Walk/Run). Check each pack's
licence before adding it.
