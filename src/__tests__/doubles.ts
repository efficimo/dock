import { Observable, type ObservableValueInterface } from "@efficimo/observable";
import type { DockStorage } from "../storage";

type Listener = (event: MessageEvent<unknown>) => void;

/** In-process `BroadcastChannel`: delivers to every other instance of the same name, never to itself. */
export class FakeBroadcastChannel {
  private static readonly channels = new Map<string, Set<FakeBroadcastChannel>>();

  private readonly listeners = new Set<Listener>();
  private closed = false;

  constructor(readonly name: string) {
    FakeBroadcastChannel.peers(name).add(this);
  }

  private static peers(name: string): Set<FakeBroadcastChannel> {
    let peers = FakeBroadcastChannel.channels.get(name);
    if (!peers) {
      peers = new Set();
      FakeBroadcastChannel.channels.set(name, peers);
    }
    return peers;
  }

  static reset(): void {
    FakeBroadcastChannel.channels.clear();
  }

  addEventListener(_type: "message", listener: Listener): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: "message", listener: Listener): void {
    this.listeners.delete(listener);
  }

  postMessage(data: unknown): void {
    for (const peer of FakeBroadcastChannel.peers(this.name)) {
      if (peer === this || peer.closed) continue;
      for (const listener of peer.listeners) listener({ data } as MessageEvent<unknown>);
    }
  }

  close(): void {
    this.closed = true;
    FakeBroadcastChannel.peers(this.name).delete(this);
  }
}

/** One store shared by every registry of a test, the way localStorage is shared by tabs. */
export function createMemoryStorage(): DockStorage {
  const stream = new Observable<string | null>();
  let value: string | null = null;

  const observable: ObservableValueInterface<string | null> = {
    getValue: () => value,
    subscribe: (subscriber) => {
      subscriber(value);
      return stream.subscribe(subscriber);
    },
    next: (input) => {
      const nextValue = typeof input === "function" ? input(value) : input;
      if (nextValue === value) return;
      value = nextValue;
      stream.next(nextValue);
    },
  };

  return { getObservable: () => observable };
}

export type FakeWindow = { closed: boolean; focus: () => void; close: () => void };

export function createFakeWindow(): FakeWindow {
  const fake: FakeWindow = {
    closed: false,
    focus: () => {},
    close: () => {
      fake.closed = true;
    },
  };
  return fake;
}
