import { BEACON } from '../core/config';
import type { NavGrid, Point } from '../navigation/NavGrid';
import { FlowField } from '../pathfinding/flowField';
import type { Simulation } from '../simulation/Simulation';

/** A second drop-off: cold until the Warden reaches it, then hauls may come here instead of the Kiln. */
export class Beacon implements Point {
  lit = false;
  readonly field: FlowField;

  constructor(
    readonly x: number,
    readonly z: number,
    private readonly nav: NavGrid,
  ) {
    this.field = new FlowField(nav);
    this.refresh();
  }

  /** Recomputes the path field, after a wall appears or disappears. */
  refresh(): void {
    this.field.invalidate();
    this.field.compute(this.nav.cellIndexAt(this.x, this.z));
  }
}

/** Lights every cold beacon the Warden is standing next to. */
export function updateBeacons(sim: Simulation): void {
  const captain = sim.captainTransform;
  for (const beacon of sim.beacons) {
    if (beacon.lit) continue;
    if (Math.hypot(beacon.x - captain.x, beacon.z - captain.z) > BEACON.lightRange) continue;
    beacon.lit = true;
    sim.emit('beaconLit', beacon.x, beacon.z);
  }
}
