import type { ReactElement } from "react";
import type { DockId } from "./types";
import { useDock } from "./useDock";

/** Rendered in place of a panel while it lives in its own window. Override with `DockConfig.fallback`. */
export function DefaultFallback({ id }: { id: DockId }): ReactElement {
  const { focusWindow, reattach } = useDock(id);

  return (
    <div data-dock-fallback={id}>
      <p>This panel is open in a separate window.</p>
      <button type="button" onClick={focusWindow}>
        Focus window
      </button>
      <button type="button" onClick={reattach}>
        Reattach
      </button>
    </div>
  );
}
