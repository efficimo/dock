import type { DockId, DockParams } from "./types";

/** Hash parameter reserved by dock — holds the id of the panel a dock window must render. */
export const DOCK_HASH_KEY = "dock";

/**
 * Reads the panel id and its params out of a location hash.
 * Returns `null` when the hash does not designate a dock window.
 */
export function parseDockHash(hash: string): { id: DockId; params: DockParams } | null {
  const search = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const id = search.get(DOCK_HASH_KEY);
  if (!id) return null;

  const params: DockParams = {};
  for (const [key, value] of search) {
    if (key !== DOCK_HASH_KEY) params[key] = value;
  }
  return { id, params };
}

/** Builds the URL a dock window is opened at. Params are carried in the hash. */
export function buildDockUrl(url: string, id: DockId, params: DockParams = {}): string {
  const search = new URLSearchParams({ ...params, [DOCK_HASH_KEY]: id });
  return `${url}#${search.toString()}`;
}
