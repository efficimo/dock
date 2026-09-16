import { isSetFunction, Observable, type ObservableValueInterface } from "@efficimo/observable";
// Type-only, erased at build time: dock declares its key without depending on the package.
import type {} from "@efficimo/storage";
import type { DockId, DockParams } from "./types";

/** Storage key holding the set of currently detached panels. */
export const DOCK_STORAGE_KEY = "@efficimo/dock";

// Declared on both stores so either `LocalStorage` or `SessionStorage` can be injected.
declare module "@efficimo/storage" {
  interface DefaultLocalStorageKeys {
    "@efficimo/dock": string;
  }
  interface DefaultSessionStorageKeys {
    "@efficimo/dock": string;
  }
}

/** What dock persists: the params each detached panel was opened with. */
export type DockPersistedState = Record<DockId, { params: DockParams }>;

/**
 * Minimal structural storage contract — `LocalStorage` and `SessionStorage`
 * from `@efficimo/storage` satisfy it, and so does {@link getLocalDockStorage}.
 */
export type DockStorage = {
  getObservable: (
    key: typeof DOCK_STORAGE_KEY,
    defaultValue?: string | null,
  ) => ObservableValueInterface<string | null>;
};

function isDockParams(value: unknown): value is DockParams {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.values(value).every((entry) => typeof entry === "string");
}

/** Tolerant parser — a corrupted or foreign payload yields an empty state rather than throwing. */
export function parsePersistedState(raw: string | null): DockPersistedState {
  if (!raw) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};

  const state: DockPersistedState = {};
  for (const [id, entry] of Object.entries(parsed)) {
    if (typeof entry !== "object" || entry === null) continue;
    const params = (entry as { params?: unknown }).params;
    state[id] = { params: isDockParams(params) ? params : {} };
  }
  return state;
}

/** Serializes to `null` when nothing is detached, so the key is removed instead of holding `{}`. */
export function serializePersistedState(state: DockPersistedState): string | null {
  return Object.keys(state).length === 0 ? null : JSON.stringify(state);
}

function createLocalStorageObservable(key: string): ObservableValueInterface<string | null> {
  const stream = new Observable<string | null>();

  const read = (): string | null => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  window.addEventListener("storage", (event) => {
    if (event.key !== null && event.key !== key) return;
    stream.next(read());
  });

  return {
    getValue: read,
    subscribe: (subscriber) => {
      subscriber(read());
      return stream.subscribe(subscriber);
    },
    next: (value) => {
      const previous = read();
      const nextValue = isSetFunction(value) ? value(previous) : value;
      if (previous === nextValue) return;
      try {
        if (nextValue === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, nextValue);
      } catch {
        // Storage can be unavailable (private mode, quota exceeded) — stay in memory only.
      }
      stream.next(nextValue);
    },
  };
}

let localDockStorage: DockStorage | null = null;

/**
 * Document-wide fallback storage used when no `storage` is given to `DockProvider`.
 * Backed by `window.localStorage` and synced across tabs through the `storage` event.
 * Built lazily so this module stays importable during server-side rendering.
 */
export function getLocalDockStorage(): DockStorage {
  if (localDockStorage === null) {
    const observable = createLocalStorageObservable(DOCK_STORAGE_KEY);
    localDockStorage = { getObservable: () => observable };
  }
  return localDockStorage;
}
