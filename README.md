# Dandori Academy

A browser RTS about dandori: planning work so that nobody stands idle. You lead a squad of
small workers, throw them at jobs, and move on while they finish on their own. The day is
scored on how much you brought home and how quickly.

This repository implements the MVP defined in the project handoff document: one worker type,
one captain, one home base, one enemy type, one treasure type, throwing, whistling, carrying,
treasure delivery, a day timer and dandori scoring.

## Run it

```sh
npm install
npm run dev        # play at http://localhost:5173
npm test           # unit, integration, full-level and stress tests
npm run typecheck
npm run lint
npm run build
```

## How to play

| Input               | Action                                               |
| ------------------- | ---------------------------------------------------- |
| WASD / arrows       | Move the Warden                                      |
| Left mouse (hold)   | Throw squad members at the cursor                    |
| Right mouse / Space | Whistle: call every worker in the circle back to you |
| Q                   | Dismiss the squad                                    |
| Mouse wheel         | Zoom                                                 |

- **Emberlings** are your workers. Thrown next to a job, they start it by themselves. Idle
  ones (pale, with a cold tip) pick up any work within a few steps.
- **Sunshards** show `carriers / needed`. Once staffed they walk home to the **Kiln**; extra
  carriers (up to double) make them faster.
- **Mossbacks** eat workers on the ground. Workers thrown onto one cling to its back and are
  safe until it shakes them off, so hit it with enough of them at once. Its carcass, hauled
  home, becomes four new Emberlings.
- You can throw over walls. Hauls cannot go over them, so they take the long way home.
- The day ends when every Sunshard is home, time runs out, the Warden is down, or no
  Emberlings remain. Leftover time only scores if everything was collected.

## Architecture

```text
src/
  game/
    core/         ECS, fixed-step clock, seeded RNG, tuning config, Zustand store
    simulation/   Simulation (state + step order), components, Rapier physics world
    world/        level definitions and entity spawners
    navigation/   nav grid, steering and obstacle sliding
    pathfinding/  A*, flow fields, min-heap
    captain/      captain movement and damage
    commands/     input state and DOM input controller
    workers/      worker state machine, squad and task assignment
    flocking/     spatial-hash separation
    throwing/     throw system
    whistle/      whistle system
    carry/        haul movement and delivery
    kiln/         worker production
    enemies/      enemy behaviour and combat
    dandori/      scoring and ranks
    save/         save data, validation and persistence
    camera/       camera rig
    rendering/    React Three Fiber scene
  ui/             title, HUD and results screens
```

The simulation is plain TypeScript with no rendering or DOM dependencies. It advances in
fixed 1/60 s steps from an `InputState` and a seeded RNG, so a day is fully deterministic
(tested), which is the base the later replay and lockstep phases need. Rendering reads the
simulation every frame; React state is only used for the HUD and for entity lists.

Performance: workers are drawn with two instanced meshes. The handoff stress scenario
(100 workers, 20 enemies, 50 carry tasks) costs about 0.35 ms of simulation per step in the
stress test, against a 16.7 ms frame.

## Deviations from the handoff document

Each of these is deliberate.

1. **Original names and look.** The handoff describes the game with another game's names and
   creatures. This project keeps the genre and mechanics but uses its own cast: Emberlings,
   the Warden, the Kiln, Mossbacks and Sunshards. Folder names follow: `workers/` instead of
   `pikmin/`, `kiln/` instead of `onion/`.
2. **Save format.** `SaveData` matches the handoff field for field, except `pikminCounts` is
   named `workerCounts`.
3. **Only folders with code exist.** Folders for later phases (caves, bosses, weather, replay,
   multiplayer and so on) are created when their phase starts, in line with "no dead code".
4. **Rapier's role.** Rapier owns the static level geometry and the captain's character
   controller. Workers, hauls and enemies move on the nav grid, which is what keeps 100+
   units cheap.
5. **Vitest** was added as the test runner. The locked stack names no runner, and "all
   systems unit-testable" needs one.

## Status against the handoff phases

| Phase | Scope                                  | Status                                                     |
| ----- | -------------------------------------- | ---------------------------------------------------------- |
| 1     | Bootstrap, main loop, world scene, ECS | Done                                                       |
| 2     | Captain, camera, navigation, rendering | Done                                                       |
| 3     | Workers, flocking, throwing, whistling | Done                                                       |
| 4     | Carrying, home base, treasure delivery | Done                                                       |
| 5     | Enemy AI, combat, territory            | Done for one enemy type                                    |
| 6     | Dandori scoring, lessons, progression  | Scoring, ranks, saves and one lesson; no lesson select yet |
| 7     | Caves, bosses, weather                 | Not started                                                |
| 8     | Replays, multiplayer foundations       | Not started (simulation is already deterministic)          |

Known limits: the JS bundle is about 5.5 MB because the Rapier build embeds its WASM; there
is no audio; frame rate has been measured for the simulation only, not on real GPUs.
