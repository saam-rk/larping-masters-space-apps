/**
 * Small in-memory TTL cache. On serverless platforms it only lives as long as
 * a warm instance, so it reduces repeated Horizons calls but is not shared.
 */
export class TtlCache<V> {
  private readonly entries = new Map<string, { readonly value: V; readonly expiresAt: number }>();

  constructor(
    private readonly options: { readonly ttlMs: number; readonly maxEntries: number; readonly now?: () => number },
  ) {}

  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    // Refresh insertion order so eviction drops the least recently used entry.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + this.options.ttlMs });
    while (this.entries.size > this.options.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
    }
  }

  get size(): number {
    return this.entries.size;
  }

  private now(): number {
    return this.options.now ? this.options.now() : Date.now();
  }
}
