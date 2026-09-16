import type { ComponentType } from "react";

export type DockId = string;

export type DockParams = Record<string, string>;

export type DockState = {
  id: DockId;
  status: "attached" | "detached";
  /** Params the panel was detached with — always empty while attached. */
  params: DockParams;
};

export type DockConfig = {
  // biome-ignore lint/suspicious/noExplicitAny: dock is a container — it does not know the props of the panels it hosts
  component: ComponentType<any>;
  fallback?: ComponentType<{ id: DockId }>;
  title: string;
  defaultSize?: { width: number; height: number };
};

export type DockBCMessage =
  /** Heartbeat sent by a dock window to prove it is still open. */
  | { type: "dock:alive"; id: DockId }
  /** A panel has just been opened in its own window. */
  | { type: "dock:detached"; id: DockId; params: DockParams }
  /** The panel must come back inline — sent by either side. */
  | { type: "dock:reattach"; id: DockId }
  /** Application-level payload forwarded between windows. */
  | { type: "dock:message"; id: DockId; payload: unknown };
