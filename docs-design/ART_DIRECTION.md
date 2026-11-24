# Dandori Academy: art direction

The reference for every piece of art in the game: what the world is, how it is lit and shaded,
and what goes in it. When an art change and this document disagree, change one of them on
purpose.

## The one idea: a garden at insect scale

Everything in Dandori Academy happens at the scale of a garden bed. **A Sproutling is about two
centimetres tall; the Warden, a clockwork figure, is the size of a thumb.** The player should
never doubt it: the world is full of ordinary things seen from far too close. A flowerpot is a
tower, a trowel is a fallen bridge, a teacup is a pond, a dropped pocket watch is a monument.

Every field therefore has two layers:

1. **The playing field**: ground, walls, water and terraces that the rules see (`obstacles`,
   `water`, `plateaus`). Walls are boxes to the rules, but are **drawn as giant everyday objects**
   chosen by their `look` (or the field's `wallLook`).
2. **Dressing**: giant objects the rules never see (`props`), placed round the edges and in corners
   so that the field reads as a small patch of a much bigger garden. Props never stand where
   anything walks or is carried; the layout tests ignore them.

Neither layer is ever made of plain boxes. If a wall has no better idea, it is old garden brick.

## Scale rules

| Thing         | World units (1 unit ≈ 1 cm) | Notes                                              |
| ------------- | --------------------------- | -------------------------------------------------- |
| Sproutling    | 0.6 tall                    | The yardstick                                      |
| Warden        | 1.2 tall                    |                                                    |
| Grass blade   | 0.4 to 1.2                  | Taller than a Sproutling at the edges              |
| Wall          | 2.2 to 3.2 tall             | Taller than the Warden; thrown over, not seen over |
| Flowerpot     | 3 to 9 across               | A pillar, a tower, a landmark                      |
| Teacup        | 5 to 7 across               |                                                    |
| Trowel, glove | 10 to 16 long               | Lie at the field's edge, half out of it            |
| Watering can  | 10 to 14 long               | A landmark visible across the field                |

Big props sit at least a little outside the field or in its corners, cut by the edge of the
frame, so the garden continues past what the player can reach.

## Settings and their objects

Each setting has a palette and a family of giant objects. Walls and props in a field come from
its setting's family (`src/game/rendering/kit.ts`).

| Setting   | Palette                                   | Walls (looks)                  | Props                                                        |
| --------- | ----------------------------------------- | ------------------------------ | ------------------------------------------------------------ |
| Meadow    | fresh greens, terracotta, sky blue, cream | hedge, brick, flowerpot, fence | flowerpot, watering can, trowel, glove, croquet hoop, button |
| Autumn    | amber, rust, ochre, conker brown          | fence, brick, root, book       | acorn cap, conker, rake head, spool, teacup                  |
| Marsh     | teal, moss, reed gold, rust               | root, tile, fence              | lost boot... (as watering can), lily pad, lantern, coin      |
| Dusk      | violet, candle gold, slate, brass         | book, tile, gear               | candle, pocket watch, thimble, spool, coin                   |
| Terrarium | glass green, brass, white stone           | glass, gear, brick             | plant label, brass gear, pocket watch, thimble               |
| Cave      | slate, root brown, lantern amber          | root, rock                     | bottle, coin, button                                         |

## Shading

- **A soft toon ramp.** Direct light falls in three soft bands (shade, mid, lit) instead of a
  smooth gradient, blended with a little of the smooth light so that rounded things stay round.
  It is applied to every standard material in the game (`src/game/rendering/toon.ts`), so the
  whole world, creatures and Sproutlings included, shares one look.
- **A painted rim light.** Edges facing away from the camera catch a little warm light, which
  separates characters and objects from the ground when seen from above.
- **Ink outlines** (medium and high graphics): a thin, warm dark line where depth jumps, drawn in
  post-processing from the scene's depth (`src/game/rendering/PostFx.tsx`). Low graphics keeps the
  toon ramp and rim, and draws no outlines.
- **No pure black and no pure white.** Ink is a dark warm brown (`#2a1d14`); highlights are cream.
- **Materials read by colour, not by texture.** Textures add a little grain; a thing is
  recognisable from its silhouette and its flat colour alone.

## Ground, foliage, water and weather

- **Ground** is never one flat colour. It blends turf, bare soil and moss by a splat map
  (`src/game/rendering/ground.ts`): soil wears along the paths from the Kiln to each treasure
  (fainter when a field has many) and round the feet of walls and banks; moss sits in the shade on
  the north side of walls. The ground stays flat: ambient occlusion shades any roll as dark wedges.
- **The border** of meadow, marsh and dusk fields is giant grass (5 to 13 tall: a forest to a
  Sproutling) with the odd giant flower, swaying in the wind. It casts no shadow onto the field.
  Foliage density follows the graphics setting.
- **Water** is darker away from its banks, foams along the shore (not where it meets more water or
  a bridge) and rings round every wading Sproutling.
- **Light tells time.** In the story the sun sets over the last 90 seconds of a day, warm and low,
  with the sky's even light fading, so the player feels the day closing before reading the clock.
- **Weather** belongs to a setting: mist on marsh and at dusk, light shafts in the Terrarium. It is
  always faint; it never hides anything that plays.

## Silhouettes and readability

- **Creatures** have one big readable shape, a head that faces where they will strike, and a
  bright tell (glow, stripe or ring) on the part that hurts. A player should know a beast by its
  outline at the furthest zoom.
- **Sproutlings** are told apart by head shape as well as colour (flame tuft, droplet, square
  cap, zig-zag bolt), so they read in greyscale and to colour-blind players.
- **Treasure** glints: relics catch the light and bloom a little; nothing else on the ground does.
- **Walls must look like walls.** Whatever object a wall is drawn as, its footprint on the ground
  is exactly the box the rules use, and it is taller than the Warden.

## Building new art

1. Walls: add a look to `WallLook` (`src/game/world/levelTypes.ts`) and a builder to `wallPieces`
   in `src/game/rendering/kit.ts`. A builder returns pieces (a primitive shape, a colour, a place
   and a size) that fill the wall's box; pieces of the same shape and colour are drawn together
   as one instanced mesh, so a long wall costs a few draw calls.
2. Props: add a kind to `PropKind` and a builder to `propPieces`, centred on the prop's origin,
   with its size at scale 1 matching the table above.
3. Put them in fields: a field's `wallLook` sets the look of every wall without its own `look`;
   `props` places dressing. Both are art only: they are left out of the field's fingerprint, so
   adding them never resets a leaderboard, and they change no rule (the balance report and every
   test stay the same).
4. Check it at all three graphics levels, and in greyscale.

## Reference fields

Lesson 1, **Many Hands**, and the first Growing Season field, **Seedbed**, are dressed fully with
the kit, along with **Over the Wall** (brick garden walls) and **Pod Orchard** (hedgerows), and
serve as the reference look. Before and after pictures are in `docs-design/art/`, along with the
marsh water and mist, the story sunset and the Terrarium light (`marsh-water-mist.jpg`,
`story-sunset.jpg`, `terrarium-light.jpg`).
