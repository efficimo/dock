import { ObjectObservableValue } from "@efficimo/observable";
import { useObservableValueState } from "@efficimo/observable-react";
import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
} from "react";
import { DockRegistry } from "./DockRegistry";
import { type DockStorage, getLocalDockStorage } from "./storage";
import type { DockConfig, DockId } from "./types";

type DockContextState = {
  registry: DockRegistry;
  panels: Record<DockId, DockConfig>;
};

export type DockContextValue = ObjectObservableValue<DockContextState>;

const DockContext = createContext<DockContextValue | null>(null);

export function useDockContext(): DockContextState {
  const ctx = useContext(DockContext);
  if (!ctx) throw new Error("useDockContext must be used within DockProvider");
  return useObservableValueState(ctx)[0];
}

export function DockProvider({
  url,
  panels,
  storage,
  children,
}: {
  /** Url a detached panel is opened at — the panel id travels in the hash. */
  url: string;
  panels: Record<DockId, DockConfig>;
  /** Defaults to a `window.localStorage` adapter. Pass `LocalStorage` from `@efficimo/storage` to share one store. */
  storage?: DockStorage;
  children: ReactNode;
}): ReactElement {
  if (useContext(DockContext) !== null) throw new Error("DockProvider cannot be nested");

  // `url` and `storage` are read once: the registry owns a channel and a window map
  // that cannot be rebound without dropping the windows already open.
  const ref = useRef<DockContextValue | null>(null);
  if (ref.current === null) {
    const resolvedStorage =
      storage ?? (typeof window === "undefined" ? null : getLocalDockStorage());
    ref.current = new ObjectObservableValue<DockContextState>({
      registry: new DockRegistry(resolvedStorage, url),
      panels,
    });
  }
  const context = ref.current;

  useEffect(() => {
    const { registry } = context.getValue();
    // `connect` is a no-op on the first mount; it revives the registry on the second
    // one, which is what StrictMode does in development.
    registry.connect();
    return () => registry.destroy();
  }, [context]);

  useEffect(() => {
    const { registry } = context.getValue();
    for (const [id, config] of Object.entries(panels)) registry.register(id, config);
    context.next((state) => ({ ...state, panels }));
  }, [context, panels]);

  return <DockContext.Provider value={context}>{children}</DockContext.Provider>;
}
