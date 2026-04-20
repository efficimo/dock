import type { DockId, DockParams } from "./types";

export type UseDockResult = {
  isDetached: boolean;
  canDetach: boolean;
  params: DockParams;
  messages: unknown;
  detach: (params?: DockParams) => void;
  reattach: () => void;
  focusWindow: () => void;
  send: (payload: unknown) => void;
};

export function useDock(_id: DockId): UseDockResult {
  // TODO: implement via DockRegistry observables
  return {
    isDetached: false,
    canDetach: false,
    params: {},
    messages: null,
    detach: () => {},
    reattach: () => {},
    focusWindow: () => {},
    send: () => {},
  };
}
