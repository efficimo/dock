import type { ObservableInterface } from "@efficimo/observable";
import { useObservableValueState } from "@efficimo/observable-react";
import { useEffect, useMemo, useRef } from "react";
import { useDockContext } from "./DockProvider";
import type { DockId, DockParams } from "./types";

export type UseDockResult = {
  isDetached: boolean;
  canDetach: boolean;
  params: DockParams;
  /** Payloads sent by other windows for this panel. See `useDockMessages` for the hook form. */
  messages: ObservableInterface<unknown>;
  detach: (params?: DockParams) => void;
  reattach: () => void;
  focusWindow: () => void;
  send: (payload: unknown) => void;
};

export function useDock(id: DockId): UseDockResult {
  const { registry } = useDockContext();
  const stateObservable = useMemo(() => registry.getDockObservable(id), [registry, id]);
  const messages = useMemo(() => registry.getMessageObservable(id), [registry, id]);
  const [state] = useObservableValueState(stateObservable);

  return useMemo(
    () => ({
      isDetached: state.status === "detached",
      canDetach: registry.canDetach(),
      params: state.params,
      messages,
      detach: (params?: DockParams) => registry.detach(id, params),
      reattach: () => registry.reattach(id),
      focusWindow: () => registry.focusWindow(id),
      send: (payload: unknown) => registry.sendMessage(id, payload),
    }),
    [registry, id, state, messages],
  );
}

/** Subscribes to the payloads other windows send for `id`. The handler may change freely. */
export function useDockMessages(id: DockId, handler: (payload: unknown) => void): void {
  const { registry } = useDockContext();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const subscription = registry
      .getMessageObservable(id)
      .subscribe((payload) => handlerRef.current(payload));
    return () => subscription.unsubscribe();
  }, [registry, id]);
}
