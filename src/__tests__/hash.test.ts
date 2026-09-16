import { describe, expect, it } from "vitest";
import { buildDockUrl, parseDockHash } from "../hash";

describe("parseDockHash", () => {
  it("returns null when the hash designates no panel", () => {
    expect(parseDockHash("")).toBeNull();
    expect(parseDockHash("#")).toBeNull();
    expect(parseDockHash("#foo=bar")).toBeNull();
  });

  it("reads the panel id and leaves it out of the params", () => {
    expect(parseDockHash("#dock=chat&thread=42")).toEqual({
      id: "chat",
      params: { thread: "42" },
    });
  });
});

describe("buildDockUrl", () => {
  it("round-trips params through the hash", () => {
    const url = buildDockUrl("/dock/", "chat", { thread: "42", q: "a b&c" });
    expect(parseDockHash(url.slice(url.indexOf("#")))).toEqual({
      id: "chat",
      params: { thread: "42", q: "a b&c" },
    });
  });

  it("keeps the reserved key authoritative over a colliding param", () => {
    const url = buildDockUrl("/", "chat", { dock: "spoofed" });
    expect(parseDockHash(url.slice(url.indexOf("#")))?.id).toBe("chat");
  });
});
