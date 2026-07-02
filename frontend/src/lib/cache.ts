// Stale-while-revalidate cache for API responses. Serves the last known
// result instantly (memory first, sessionStorage across reloads) so the UI
// never blanks while the network round-trip happens in the background.

const SS_KEY = 'jh_cache_v1';
const MAX_ENTRIES = 40;

interface CacheEntry {
  data: unknown;
  at: number;
}

let mem = new Map<string, CacheEntry>();

// Hydrate once per page load so a full reload still paints instantly.
try {
  const raw = sessionStorage.getItem(SS_KEY);
  if (raw) mem = new Map(Object.entries(JSON.parse(raw) as Record<string, CacheEntry>));
} catch {
  /* corrupt/unavailable storage — start empty */
}

function persist() {
  try {
    sessionStorage.setItem(SS_KEY, JSON.stringify(Object.fromEntries(mem)));
  } catch {
    /* quota exceeded — memory cache still works */
  }
}

export function cacheGet<T>(key: string): T | null {
  return (mem.get(key)?.data as T) ?? null;
}

export function cacheSet(key: string, data: unknown): void {
  mem.delete(key); // re-insert so Map order doubles as LRU order
  mem.set(key, { data, at: Date.now() });
  while (mem.size > MAX_ENTRIES) {
    const oldest = mem.keys().next().value;
    if (oldest === undefined) break;
    mem.delete(oldest);
  }
  persist();
}

// Drop everything (e.g. after running the scraper, when counts go stale).
export function cacheClear(): void {
  mem.clear();
  try {
    sessionStorage.removeItem(SS_KEY);
  } catch {
    /* ignore */
  }
}
