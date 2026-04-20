import type { ReactElement } from "react";
import { useDockContext } from "./DockProvider";
import type { DockId } from "./types";

export function DockSlot({ id }: { id: DockId }): ReactElement | null {
  const { panels } = useDockContext();
  const config = panels[id];
  if (!config) return null;
  const Component = config.component;
  return (
    <div data-dock-state="attached">
      <Component />
    </div>
  );
}
