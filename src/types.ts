import type { ComponentType } from "react";

export type DockId = string;

export type DockState = {
  id: DockId;
  status: "attached" | "detached";
};

export type DockParams = Record<string, string>;

export type DockConfig = {
  // biome-ignore lint/suspicious/noExplicitAny: dock is a container — it does not know the props of the panels it hosts
  component: ComponentType<any>;
  fallback?: ComponentType<{ id: DockId }>;
  title: string;
  defaultSize?: { width: number; height: number };
};

export type DockBCMessage =
  | { type: "dock:alive"; id: DockId }
  | { type: "dock:reattach"; id: DockId }
  | { type: "dock:message"; id: DockId; payload: unknown };
