/**
 * Deterministic fixed-step clock. Feed it real frame deltas; it answers how many
 * simulation steps to run. Excess time beyond `maxSteps` is dropped so a stalled
 * tab cannot trigger a spiral of catch-up steps.
 */
export class FixedClock {
  private accumulator = 0;

  constructor(
    readonly step: number,
    private readonly maxSteps = 5,
  ) {}

  advance(delta: number): number {
    this.accumulator += delta;
    let steps = Math.floor(this.accumulator / this.step + 1e-9);
    if (steps > this.maxSteps) {
      steps = this.maxSteps;
      this.accumulator = 0;
    } else {
      this.accumulator -= steps * this.step;
    }
    return steps;
  }
}
