import * as Timers from './timers';


export class BaseCollectionMixin<K, V> {
  get length(): number {
    return this.size;
  }

  get size(): number {
    return 0;
  }

  clear(): void {
    
  }

  entries(): IterableIterator<[K, V]> {
    return this[Symbol.iterator]();
  }

  every(func: (v: V, k: K) => boolean): boolean {
    for (let [key, value] of this) {
        if (!func(value, key)) {
          return false;
      }
    }
    return true;
  }

  filter(func: (v: V, k: K) => boolean): Array<V> {
    const map = [];
    for (let [key, value] of this) {
      if (func(value, key)) {
        map.push(value);
      }
    }
    return map;
  }

  find(func: (v: V, k: K) => boolean): V | undefined {
    for (let [key, value] of this) {
      if (func(value, key)) {
        return value;
      }
    }
    return undefined;
  }

  first(): V | undefined {
    for (let [key, value] of this) {
      return value;
    }
  }

  forEach(func: (v: V, k: K, map: Map<K, V>) => void, thisArg?: any): void {

  }

  map(func: (v: V, k: K) => any): Array<any> {
    const map = [];
    for (let [key, value] of this) {
        map.push(func(value, key));
    }
    return map;
  }

  reduce(func: (intial: any, v: V) => any, initialValue?: any): any {
    let reduced = initialValue;
    for (let [key, value] of this) {
      reduced = func(reduced, value);
    }
    return reduced;
  }

  some(func: (v: V, k: K) => boolean): boolean {
    for (let [key, value] of this) {
        if (func(value, key)) {
            return true;
        }
    }
    return false;
  }

  toArray(): Array<V> {
    return Array.from(this.values());
  }

  toJSON(): Array<V> {
    return this.toArray();
  }

  toString(): string {
    return this[Symbol.toStringTag];
  }

  *keys(): IterableIterator<K> {

  }

  *values(): IterableIterator<V> {

  }

  *[Symbol.iterator](): IterableIterator<[K, V]> {
    
  }

  get [Symbol.toStringTag]() {
    return 'BaseCollection';
  }
}


export interface BaseCollectionOptions {
  expire?: number,
  intervalTime?: number,
  limit?: number,
}

export class BaseCollection<K, V> extends BaseCollectionMixin<K, V> {
  cache = new Map<K, V>();
  expire?: number;
  lastUsed = new Map<K, number>();
  interval = new Timers.Interval();
  intervalTime = 5000;
  limit: number = Infinity;

  constructor({expire, intervalTime, limit}: BaseCollectionOptions = {}) {
    super();

    this.expire = expire;
    this.intervalTime = (intervalTime === undefined) ? this.intervalTime : intervalTime;
    this.limit = (limit === undefined) ? this.limit : limit;

    if (this.expire) {
      this.intervalTime = Math.min(this.expire, this.intervalTime);
    }

    Object.defineProperties(this, {
      cache: {enumerable: false},
      expire: {configurable: true, writable: false},
      lastUsed: {enumerable: false},
      interval: {enumerable: false},
      intervalTime: {configurable: true, enumerable: false, writable: false},
      limit: {enumerable: false},
    });
  }

  get shouldStartInterval(): boolean {
    return !this.interval.hasStarted && !!this.intervalTime;
  }

  setExpire(value: number): this {
    Object.defineProperty(this, 'expire', {value});
    if (value) {
      if (this.size) {
        this.startInterval();
      }
    } else {
      this.stopInterval();
    }
    return this;
  }

  setIntervalTimeout(value: number): this {
    Object.defineProperty(this, 'intervalTime', {value});
    if (value) {
      if (this.size) {
        this.startInterval();
      }
    } else {
      this.stopInterval();
    }
    return this;
  }

  startInterval() {
    if (this.intervalTime) {
      this.interval.start(this.intervalTime, () => {
        const expire = this.expire;
        if (expire) {
          const now = Date.now();
          for (let [key, lastUsed] of this.lastUsed) {
            if (expire < now - lastUsed) {
              this.delete(key);
            }
          }
        }
      });
    } else {
      this.stopInterval();
    }
  }

  stopInterval() {
    this.interval.stop();
  }

  get size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.stopInterval();
    this.cache.clear();
    this.lastUsed.clear();
  }

  clone(): BaseCollection<K, V> {
    const collection = new BaseCollection<K, V>(this);
    for (let [key, value] of this) {
      collection.set(key, value);
    }
    return collection;
  }

  delete(key: K): boolean {
    const deleted = this.cache.delete(key);
    this.lastUsed.delete(key);
    if (!this.cache.size) {
      this.stopInterval();
    }
    return deleted;
  }

  forEach(func: (v: V, k: K, map: Map<K, V>) => void, thisArg?: any): void {
    return this.cache.forEach(func, thisArg);
  }

  get(key: K): V | undefined {
    if (this.expire && this.cache.has(key)) {
      this.lastUsed.set(key, Date.now());
    }
    return this.cache.get(key);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  keys(): IterableIterator<K>  {
    return this.cache.keys();
  }

  set(key: K, value: V): this {
    this.cache.set(key, value);
    if (this.expire) {
      this.lastUsed.set(key, Date.now());
      if (this.shouldStartInterval) {
        this.startInterval();
      }
    }
    return this;
  }

  values(): IterableIterator<V> {
    return this.cache.values();
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.cache[Symbol.iterator]();
  }

  get [Symbol.toStringTag](): string {
    return `BaseCollection (${this.size.toLocaleString()} items)`;
  }
}