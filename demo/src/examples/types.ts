import type { DockConfig, DockId } from "@efficimo/dock";
import type { ComponentType, ReactNode } from "react";

export type Example = {
  id: string;
  title: string;
  /** One line, shown in the sidebar — say which dock capability the example exercises. */
  description: string;
  /** Panels this example contributes to the app-wide registry. */
  panels: Record<DockId, DockConfig>;
  /**
   * Wraps the whole app, not just this example's page: a detached window renders the
   * panel outside of any page, and needs the same context the inline panel had.
   */
  Provider?: ComponentType<{ children: ReactNode }>;
  Page: ComponentType;
};
