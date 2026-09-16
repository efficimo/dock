import type { ReactElement } from "react";
import { DefaultFallback } from "./DefaultFallback";
import { useDockContext } from "./DockProvider";
import type { DockId } from "./types";
import { useDock } from "./useDock";

/** Renders the panel inline, or its fallback while it is detached. */
export function DockSlot({ id }: { id: DockId }): ReactElement | null {
  const { panels } = useDockContext();
  const { isDetached } = useDock(id);

  const config = panels[id];
  if (!config) return null;

  if (isDetached) {
    const Fallback = config.fallback ?? DefaultFallback;
    return (
      <div data-dock-state="detached">
        <Fallback id={id} />
      </div>
    );
  }

  const Component = config.component;
  return (
    <div data-dock-state="attached">
      <Component />
    </div>
  );
}
