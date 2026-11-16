import type { Box, Point } from '../navigation/NavGrid';
import { FlowField } from '../pathfinding/flowField';
import type { NavGrid } from '../navigation/NavGrid';
import type { Simulation } from '../simulation/Simulation';

/** A river crossing under construction, with the flow field that leads Span-logs to its bank. */
export class BridgeSite {
  delivered = 0;
  built = false;
  readonly field: FlowField;

  constructor(
    readonly box: Box,
    readonly bank: Point,
    readonly needs: number,
    private readonly nav: NavGrid,
  ) {
    this.field = new FlowField(nav);
    this.refresh();
  }

  /** Recomputes the path field, after a wall appears or disappears. */
  refresh(): void {
    this.field.invalidate();
    this.field.compute(this.nav.cellIndexAt(this.bank.x, this.bank.z));
  }

  /** Span-logs already being carried here. */
  enRoute(sim: Simulation): number {
    let count = 0;
    const index = sim.bridges.indexOf(this);
    for (const [, carryable] of sim.carryables.entries()) {
      if (carryable.kind === 'log' && carryable.dest === index && carryable.moving) count++;
    }
    return count;
  }
}
