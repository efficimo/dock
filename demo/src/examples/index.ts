import type { DockConfig, DockId } from "@efficimo/dock";
import { chatExample } from "./chat";
import { dashboardExample } from "./dashboard";
import { inspectorExample } from "./inspector";
import { logsExample } from "./logs";
import type { Example } from "./types";

export type { Example } from "./types";

export const EXAMPLES: Example[] = [chatExample, inspectorExample, logsExample, dashboardExample];

/**
 * Panels are declared app-wide, not per page: a dock window renders a panel on its own,
 * without ever mounting the page that happened to show it.
 */
export const PANELS: Record<DockId, DockConfig> = EXAMPLES.reduce<Record<DockId, DockConfig>>(
  (acc, example) => Object.assign(acc, example.panels),
  {},
);
