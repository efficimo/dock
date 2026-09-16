import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DockRegistry, HEARTBEAT_TIMEOUT } from "../DockRegistry";
import type { DockStorage } from "../storage";
import type { DockState } from "../types";
import {
  createFakeWindow,
  createMemoryStorage,
  FakeBroadcastChannel,
  type FakeWindow,
} from "./doubles";

const URL_UNDER_TEST = "/dock/";

let storage: DockStorage;
let opened: FakeWindow[];
let registries: DockRegistry[];

/** Builds a registry the way `DockProvider` would, in a document whose hash is `hash`. */
function createRegistry(hash = ""): DockRegistry {
  window.location.hash = hash;
  const registry = new DockRegistry(storage, URL_UNDER_TEST);
  registries.push(registry);
  return registry;
}

function stateOf(registry: DockRegistry, id: string): DockState {
  return registry.getDockObservable(id).getValue();
}

beforeEach(() => {
  FakeBroadcastChannel.reset();
  storage = createMemoryStorage();
  opened = [];
  registries = [];

  vi.stubGlobal("BroadcastChannel", FakeBroadcastChannel);
  vi.spyOn(window, "open").mockImplementation(() => {
    const fake = createFakeWindow();
    opened.push(fake);
    return fake as unknown as Window;
  });
  vi.spyOn(window, "close").mockImplementation(() => {});
});

afterEach(() => {
  for (const registry of registries) registry.destroy();
  window.location.hash = "";
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("canDetach", () => {
  it("is true in an opener document and false inside a dock window", () => {
    expect(createRegistry().canDetach()).toBe(true);
    expect(createRegistry("#dock=chat").canDetach()).toBe(false);
  });

  it("is false once destroyed and true again after connect", () => {
    const registry = createRegistry();
    registry.destroy();
    expect(registry.canDetach()).toBe(false);

    // What React StrictMode does on the second mount.
    registry.connect();
    expect(registry.canDetach()).toBe(true);
  });
});

describe("detach", () => {
  it("opens the panel url with the configured size and marks it detached", () => {
    const registry = createRegistry();
    registry.register("chat", {
      component: () => null,
      title: "Chat",
      defaultSize: { width: 300, height: 200 },
    });

    registry.detach("chat", { thread: "42" });

    expect(window.open).toHaveBeenCalledWith(
      "/dock/#thread=42&dock=chat",
      "dock-chat",
      "popup=yes,width=300,height=200",
    );
    expect(stateOf(registry, "chat")).toEqual({
      id: "chat",
      status: "detached",
      params: { thread: "42" },
    });
  });

  it("stays attached when the popup is blocked", () => {
    const registry = createRegistry();
    vi.mocked(window.open).mockReturnValueOnce(null);

    registry.detach("chat");

    expect(stateOf(registry, "chat").status).toBe("attached");
    expect(storage.getObservable("@efficimo/dock").getValue()).toBeNull();
  });

  it("focuses the existing window instead of opening a second one", () => {
    const registry = createRegistry();
    registry.detach("chat");
    const focus = vi.spyOn(opened[0], "focus");

    registry.detach("chat");

    expect(window.open).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalled();
  });

  it("is refused inside a dock window", () => {
    createRegistry("#dock=chat").detach("chat");
    expect(window.open).not.toHaveBeenCalled();
  });
});

describe("cross-window state", () => {
  it("propagates detach and reattach to another tab", () => {
    const opener = createRegistry();
    const otherTab = createRegistry();

    opener.detach("chat", { thread: "42" });
    expect(stateOf(otherTab, "chat")).toEqual({
      id: "chat",
      status: "detached",
      params: { thread: "42" },
    });

    opener.reattach("chat");
    expect(stateOf(otherTab, "chat").status).toBe("attached");
    expect(stateOf(opener, "chat").status).toBe("attached");
    expect(opened[0].closed).toBe(true);
  });

  it("restores the detached panels of a reloaded opener", () => {
    createRegistry().detach("chat", { thread: "42" });

    const reloaded = createRegistry();

    expect(stateOf(reloaded, "chat")).toEqual({
      id: "chat",
      status: "detached",
      params: { thread: "42" },
    });
  });

  it("closes the dock window when the opener asks it to reattach", () => {
    const opener = createRegistry();
    opener.detach("chat");
    createRegistry("#dock=chat");

    opener.reattach("chat");

    expect(window.close).toHaveBeenCalled();
  });
});

describe("heartbeat", () => {
  it("pulls a panel back when its window stops answering", () => {
    vi.useFakeTimers();
    const opener = createRegistry();
    opener.detach("chat");

    vi.advanceTimersByTime(HEARTBEAT_TIMEOUT + 1_000);

    expect(stateOf(opener, "chat").status).toBe("attached");
  });

  it("keeps the panel detached while its window keeps answering", () => {
    vi.useFakeTimers();
    const opener = createRegistry();
    opener.detach("chat");
    createRegistry("#dock=chat");

    vi.advanceTimersByTime(HEARTBEAT_TIMEOUT + 1_000);

    expect(stateOf(opener, "chat").status).toBe("detached");
  });
});

describe("sendMessage", () => {
  it("reaches the other windows but never echoes to the sender", () => {
    const opener = createRegistry();
    const otherTab = createRegistry();
    const received: unknown[] = [];
    const echoed: unknown[] = [];
    otherTab.getMessageObservable("chat").subscribe((payload) => received.push(payload));
    opener.getMessageObservable("chat").subscribe((payload) => echoed.push(payload));

    opener.sendMessage("chat", { text: "hello" });

    expect(received).toEqual([{ text: "hello" }]);
    expect(echoed).toEqual([]);
  });

  it("keeps panels apart", () => {
    const opener = createRegistry();
    const otherTab = createRegistry();
    const received: unknown[] = [];
    otherTab.getMessageObservable("other").subscribe((payload) => received.push(payload));

    opener.sendMessage("chat", "hello");

    expect(received).toEqual([]);
  });
});

describe("adoption", () => {
  it("lets an opener with no persisted state adopt a live dock window", () => {
    const opener = createRegistry();

    createRegistry("#dock=chat&thread=42");

    expect(stateOf(opener, "chat")).toEqual({
      id: "chat",
      status: "detached",
      params: { thread: "42" },
    });
  });
});

describe("outlet state", () => {
  it("exposes the hash params on the first read, with no storage at all", () => {
    window.location.hash = "#dock=chat&thread=42";
    const outlet = new DockRegistry(null, URL_UNDER_TEST);
    registries.push(outlet);

    expect(stateOf(outlet, "chat")).toEqual({
      id: "chat",
      status: "detached",
      params: { thread: "42" },
    });
  });
});
