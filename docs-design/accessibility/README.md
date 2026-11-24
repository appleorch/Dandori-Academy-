# Accessibility check: telling the kinds apart

Screenshots for roadmap chunk 2, taken at device scale 2 on medium graphics in lesson 17
(Crossroads), with one row per kind: Emberlings, Dewlings, Stonelings, Sparklings.

- `kinds-colour.png`: the standard palette.
- `kinds-greyscale.png`: the same frame through a greyscale filter. The kinds stay apart by
  the shape on their heads alone: a flame tuft, a round droplet, a flat square cap and a
  zig-zag bolt.
- `kinds-deuteranopia-palette.png` and `kinds-tritanopia-palette.png`: the two colour-blind
  palettes from Settings. `src/game/rendering/palette.test.ts` simulates each kind of colour
  blindness and checks every pair of kinds, the warning rings and the medal colours stay far
  apart.
