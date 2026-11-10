export type Entity = number;

/** Entity ids start at 1, so 0 is free to mean "no entity". */
export const NO_ENTITY: Entity = 0;

/** Component storage. Iteration follows insertion order, which keeps the simulation deterministic. */
export class Store<T> {
  private readonly items = new Map<Entity, T>();

  set(entity: Entity, value: T): T {
    this.items.set(entity, value);
    return value;
  }

  get(entity: Entity): T | undefined {
    return this.items.get(entity);
  }

  require(entity: Entity): T {
    const value = this.items.get(entity);
    if (value === undefined) throw new Error(`Entity ${entity} is missing a required component`);
    return value;
  }

  has(entity: Entity): boolean {
    return this.items.has(entity);
  }

  delete(entity: Entity): boolean {
    return this.items.delete(entity);
  }

  get size(): number {
    return this.items.size;
  }

  entries(): IterableIterator<[Entity, T]> {
    return this.items.entries();
  }
}

interface Deletable {
  delete(entity: Entity): boolean;
}

export class EcsWorld {
  private nextId = 1;
  private readonly alive = new Set<Entity>();
  private readonly stores: Deletable[] = [];

  createStore<T>(): Store<T> {
    const store = new Store<T>();
    this.stores.push(store);
    return store;
  }

  create(): Entity {
    const entity = this.nextId++;
    this.alive.add(entity);
    return entity;
  }

  destroy(entity: Entity): void {
    if (!this.alive.delete(entity)) return;
    for (const store of this.stores) store.delete(entity);
  }

  isAlive(entity: Entity): boolean {
    return this.alive.has(entity);
  }
}
