import { describe, expect, it } from "vitest";
import { parsePersistedState, serializePersistedState } from "../storage";

describe("parsePersistedState", () => {
  it("yields an empty state for anything unusable", () => {
    for (const raw of [null, "", "not json", "[]", '"str"', "42"]) {
      expect(parsePersistedState(raw)).toEqual({});
    }
  });

  it("keeps entries and defaults missing or malformed params to an empty record", () => {
    expect(parsePersistedState('{"a":{"params":{"x":"1"}},"b":{},"c":{"params":{"x":1}}}')).toEqual(
      {
        a: { params: { x: "1" } },
        b: { params: {} },
        c: { params: {} },
      },
    );
  });
});

describe("serializePersistedState", () => {
  it("removes the key rather than storing an empty object", () => {
    expect(serializePersistedState({})).toBeNull();
  });

  it("round-trips a populated state", () => {
    const state = { chat: { params: { thread: "42" } } };
    expect(parsePersistedState(serializePersistedState(state))).toEqual(state);
  });
});
