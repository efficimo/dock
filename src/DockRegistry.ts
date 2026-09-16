import {
  Observable,
  type ObservableInterface,
  ObservableValue,
  type ObservableValueInterface,
  type SubscriptionInterface,
} from "@efficimo/observable";
import { buildDockUrl, parseDockHash } from "./hash";
import {
  DOCK_STORAGE_KEY,
  type DockPersistedState,
  type DockStorage,
  parsePersistedState,
  serializePersistedState,
} from "./storage";
import type { DockBCMessage, DockConfig, DockId, DockParams, DockState } from "./types";

/** How often a dock window announces it is still open. */
export const HEARTBEAT_INTERVAL = 1_000;
/** How long the opener waits without a heartbeat before pulling a panel back inline. */
export const HEARTBEAT_TIMEOUT = 3_000;

const WATCHDOG_INTERVAL = 500;
const DEFAULT_SIZE = { width: 480, height: 640 };

/**
 * Owns the cross-window plumbing: one `BroadcastChannel` per dock url, the detached
 * state of every panel, and the windows this document opened.
 *
 * The same class runs on both sides. A registry whose document carries a dock hash
 * behaves as an *outlet*: it heartbeats instead of supervising, and never detaches.
 */
export class DockRegistry {
  private readonly url: string;
  private readonly storage: DockStorage | null;
  private readonly outlet: { id: DockId; params: DockParams } | null;
  private readonly configs = new Map<DockId, DockConfig>();
  private readonly states = new Map<DockId, ObservableValue<DockState>>();
  private readonly messages = new Map<DockId, Observable<unknown>>();
  private readonly windows = new Map<DockId, Window>();
  private readonly lastSeen = new Map<DockId, number>();

  private persisted: DockPersistedState = {};
  private channel: BroadcastChannel | null = null;
  private storageSubscription: SubscriptionInterface | null = null;
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private connected = false;

  constructor(storage: DockStorage | null, url: string) {
    this.url = url;
    this.storage = storage;
    this.outlet = typeof window === "undefined" ? null : parseDockHash(window.location.hash);
    this.connect();
  }

  /**
   * Opens the channel and subscriptions. Called by the constructor, and again by
   * `DockProvider` so a registry survives React StrictMode's mount/unmount/mount cycle.
   * No-op while already connected.
   */
  connect(): void {
    if (this.connected || typeof window === "undefined") return;
    this.connected = true;

    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(`@efficimo/dock:${this.url}`);
      this.channel.addEventListener("message", this.handleChannelMessage);
    }

    const observable = this.storage?.getObservable(DOCK_STORAGE_KEY) ?? null;
    if (observable) this.storageSubscription = observable.subscribe(this.handlePersistedState);

    if (this.outlet) {
      // The hash is authoritative here: seed the state from it so `useDock().params` is
      // correct on the very first render, even when storage is unavailable.
      const { id, params } = this.outlet;
      this.persisted = { ...this.persisted, [id]: { params } };
      this.setState(id, { id, status: "detached", params });

      // Announce rather than merely ping, so an opener that lost its persisted state
      // (reload with a cleared store, or a window opened by hand) adopts this panel.
      this.post({ type: "dock:detached", id, params });
      this.heartbeat = setInterval(this.announceAlive, HEARTBEAT_INTERVAL);
      window.addEventListener("beforeunload", this.handleBeforeUnload);
    } else {
      this.watchdog = setInterval(this.evictStaleWindows, WATCHDOG_INTERVAL);
    }
  }

  /** Tears everything down. Idempotent — `connect()` brings the registry back. */
  destroy(): void {
    if (!this.connected) return;
    this.connected = false;

    if (this.watchdog !== null) clearInterval(this.watchdog);
    if (this.heartbeat !== null) clearInterval(this.heartbeat);
    this.watchdog = null;
    this.heartbeat = null;

    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.handleBeforeUnload);
    }

    this.channel?.removeEventListener("message", this.handleChannelMessage);
    this.channel?.close();
    this.channel = null;

    this.storageSubscription?.unsubscribe();
    this.storageSubscription = null;
  }

  /** The panel this document must render, or `null` when it is not a dock window. */
  getOutlet(): { id: DockId; params: DockParams } | null {
    return this.outlet;
  }

  getDockObservable(id: DockId): ObservableValueInterface<DockState> {
    let observable = this.states.get(id);
    if (!observable) {
      const entry = this.persisted[id];
      observable = new ObservableValue<DockState>({
        id,
        status: entry ? "detached" : "attached",
        params: entry?.params ?? {},
      });
      this.states.set(id, observable);
    }
    return observable;
  }

  /** Stream of payloads sent by *other* windows — a sender never receives its own message. */
  getMessageObservable(id: DockId): ObservableInterface<unknown> {
    let observable = this.messages.get(id);
    if (!observable) {
      observable = new Observable<unknown>();
      this.messages.set(id, observable);
    }
    return observable;
  }

  /** Makes the panel's title and default size available to `detach`. */
  register(id: DockId, config: DockConfig): void {
    this.configs.set(id, config);
  }

  detach(id: DockId, params: DockParams = {}): void {
    if (!this.canDetach()) return;

    const existing = this.windows.get(id);
    if (existing && !existing.closed) {
      existing.focus();
      return;
    }

    const size = this.configs.get(id)?.defaultSize ?? DEFAULT_SIZE;
    const child = window.open(
      buildDockUrl(this.url, id, params),
      `dock-${id}`,
      `popup=yes,width=${size.width},height=${size.height}`,
    );
    // Blocked by the popup blocker — stay attached rather than leaving a ghost state behind.
    if (!child) return;

    this.windows.set(id, child);
    this.lastSeen.set(id, Date.now());
    this.persist((state) => ({ ...state, [id]: { params } }));
    this.setState(id, { id, status: "detached", params });
    this.post({ type: "dock:detached", id, params });
  }

  reattach(id: DockId): void {
    this.post({ type: "dock:reattach", id });
    if (this.outlet?.id === id) {
      window.close();
      return;
    }
    this.pullBack(id);
  }

  focusWindow(id: DockId): void {
    const child = this.windows.get(id);
    if (child && !child.closed) child.focus();
  }

  sendMessage(id: DockId, payload: unknown): void {
    this.post({ type: "dock:message", id, payload });
  }

  canDetach(): boolean {
    return (
      this.connected &&
      this.outlet === null &&
      typeof window !== "undefined" &&
      typeof window.open === "function" &&
      this.channel !== null
    );
  }

  private setState(id: DockId, state: DockState): void {
    this.getDockObservable(id).next(state);
  }

  private post(message: DockBCMessage): void {
    this.channel?.postMessage(message);
  }

  private persist(update: (state: DockPersistedState) => DockPersistedState): void {
    this.persisted = update(this.persisted);
    this.storage?.getObservable(DOCK_STORAGE_KEY).next(serializePersistedState(this.persisted));
  }

  /** Brings a panel back inline and forgets everything about its window. */
  private pullBack(id: DockId): void {
    const child = this.windows.get(id);
    if (child && !child.closed) child.close();
    this.windows.delete(id);
    this.lastSeen.delete(id);
    this.persist(({ [id]: _removed, ...rest }) => rest);
    this.setState(id, { id, status: "attached", params: {} });
  }

  private readonly announceAlive = (): void => {
    if (this.outlet) this.post({ type: "dock:alive", id: this.outlet.id });
  };

  private readonly handleBeforeUnload = (): void => {
    if (this.outlet) this.post({ type: "dock:reattach", id: this.outlet.id });
  };

  /**
   * Restores the detached panels after a reload, and follows changes made by other tabs.
   * Fires once synchronously on subscribe with the value already in storage.
   */
  private readonly handlePersistedState = (raw: string | null): void => {
    this.persisted = parsePersistedState(raw);

    for (const id of new Set([...this.states.keys(), ...Object.keys(this.persisted)])) {
      const entry = this.persisted[id];
      if (entry) {
        // Give a window we did not open ourselves a full timeout to prove it is alive.
        if (!this.lastSeen.has(id)) this.lastSeen.set(id, Date.now());
        this.setState(id, { id, status: "detached", params: entry.params });
      } else {
        this.lastSeen.delete(id);
        this.setState(id, { id, status: "attached", params: {} });
      }
    }
  };

  private readonly handleChannelMessage = (event: MessageEvent<DockBCMessage>): void => {
    const message = event.data;
    switch (message.type) {
      case "dock:alive":
        this.lastSeen.set(message.id, Date.now());
        break;
      case "dock:detached":
        this.lastSeen.set(message.id, Date.now());
        this.persist((state) => ({ ...state, [message.id]: { params: message.params } }));
        this.setState(message.id, {
          id: message.id,
          status: "detached",
          params: message.params,
        });
        break;
      case "dock:reattach":
        if (this.outlet?.id === message.id) window.close();
        else this.pullBack(message.id);
        break;
      case "dock:message":
        this.messages.get(message.id)?.next(message.payload);
        break;
    }
  };

  /** A dock window that stopped heartbeating — closed, crashed or navigated away. */
  private readonly evictStaleWindows = (): void => {
    const now = Date.now();
    for (const [id, seen] of this.lastSeen) {
      const child = this.windows.get(id);
      if (child?.closed !== true && now - seen <= HEARTBEAT_TIMEOUT) continue;
      this.pullBack(id);
    }
  };
}
