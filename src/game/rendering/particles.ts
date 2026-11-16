export interface BurstStyle {
  count: number;
  /** [r, g, b], each 0 to 1. */
  color: readonly [number, number, number];
  speed: number;
  /** Extra upward speed. */
  lift: number;
  life: number;
  size: number;
  /** Multiplier on gravity; negative makes particles drift upward. */
  gravity: number;
}

const GRAVITY = 12;

/** Fixed-size pool of simple ballistic particles. The oldest are reused first. */
export class ParticleSystem {
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly z: Float32Array;
  readonly scale: Float32Array;
  readonly color: Float32Array;
  private readonly vx: Float32Array;
  private readonly vy: Float32Array;
  private readonly vz: Float32Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly size: Float32Array;
  private readonly weight: Float32Array;
  private next = 0;

  constructor(readonly capacity: number) {
    const make = (): Float32Array => new Float32Array(capacity);
    this.x = make();
    this.y = make();
    this.z = make();
    this.scale = make();
    this.vx = make();
    this.vy = make();
    this.vz = make();
    this.life = make();
    this.maxLife = make();
    this.size = make();
    this.weight = make();
    this.color = new Float32Array(capacity * 3);
  }

  burst(x: number, y: number, z: number, style: BurstStyle): void {
    for (let n = 0; n < style.count; n++) {
      const i = this.next;
      this.next = (this.next + 1) % this.capacity;
      const angle = Math.random() * Math.PI * 2;
      const speed = style.speed * (0.4 + Math.random() * 0.6);
      this.x[i] = x;
      this.y[i] = y;
      this.z[i] = z;
      this.vx[i] = Math.sin(angle) * speed;
      this.vz[i] = Math.cos(angle) * speed;
      this.vy[i] = style.lift * (0.5 + Math.random() * 0.5);
      this.life[i] = this.maxLife[i] = style.life * (0.6 + Math.random() * 0.4);
      this.size[i] = style.size * (0.6 + Math.random() * 0.4);
      this.weight[i] = style.gravity;
      this.color.set(style.color, i * 3);
    }
  }

  update(dt: number): void {
    for (let i = 0; i < this.capacity; i++) {
      if (this.life[i] <= 0) {
        this.scale[i] = 0;
        continue;
      }
      this.life[i] -= dt;
      this.vy[i] -= GRAVITY * this.weight[i] * dt;
      this.x[i] += this.vx[i] * dt;
      this.y[i] = Math.max(0.03, this.y[i] + this.vy[i] * dt);
      this.z[i] += this.vz[i] * dt;
      this.scale[i] = this.size[i] * Math.max(0, this.life[i] / this.maxLife[i]);
    }
  }
}
