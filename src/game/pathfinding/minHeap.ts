/** Binary min-heap of (value, priority) pairs. */
export class MinHeap {
  private readonly values: number[] = [];
  private readonly priorities: number[] = [];

  get size(): number {
    return this.values.length;
  }

  push(value: number, priority: number): void {
    const { values, priorities } = this;
    let i = values.length;
    values.push(value);
    priorities.push(priority);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (priorities[parent] <= priority) break;
      values[i] = values[parent];
      priorities[i] = priorities[parent];
      i = parent;
    }
    values[i] = value;
    priorities[i] = priority;
  }

  /** Removes and returns the value with the lowest priority. The heap must not be empty. */
  pop(): number {
    const { values, priorities } = this;
    const top = values[0];
    const lastValue = values.pop() as number;
    const lastPriority = priorities.pop() as number;
    const n = values.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        let child = 2 * i + 1;
        if (child >= n) break;
        if (child + 1 < n && priorities[child + 1] < priorities[child]) child++;
        if (priorities[child] >= lastPriority) break;
        values[i] = values[child];
        priorities[i] = priorities[child];
        i = child;
      }
      values[i] = lastValue;
      priorities[i] = lastPriority;
    }
    return top;
  }
}
