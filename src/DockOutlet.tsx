import { type ReactElement, useEffect } from "react";
import { useDockContext } from "./DockProvider";

/**
 * Renders the single panel a dock window was opened for. Render it instead of your
 * layout when `parseDockHash(window.location.hash)` is not `null`.
 *
 * The heartbeat, the `beforeunload` notice and the reaction to a reattach request all
 * live in `DockRegistry`, so they run as soon as `DockProvider` mounts.
 */
export function DockOutlet(): ReactElement | null {
  const { registry, panels } = useDockContext();
  const outlet = registry.getOutlet();
  const config = outlet ? panels[outlet.id] : undefined;
  const title = config?.title;

  useEffect(() => {
    if (title !== undefined) document.title = title;
  }, [title]);

  if (!outlet || !config) return null;

  const Component = config.component;
  return (
    <div data-dock-state="outlet" data-dock-id={outlet.id}>
      <Component />
    </div>
  );
}
