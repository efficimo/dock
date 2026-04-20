import { createContext, type ReactElement, type ReactNode, useContext } from "react";
import type { DockConfig, DockId } from "./types";

type DockContextValue = {
  panels: Record<DockId, DockConfig>;
};

const DockContext = createContext<DockContextValue | null>(null);

export function useDockContext(): DockContextValue {
  const ctx = useContext(DockContext);
  if (!ctx) throw new Error("useDockContext must be used within DockProvider");
  return ctx;
}

export function DockProvider({
  url: _url,
  panels,
  children,
}: {
  url: string;
  panels: Record<DockId, DockConfig>;
  children: ReactNode;
}): ReactElement {
  return <DockContext.Provider value={{ panels }}>{children}</DockContext.Provider>;
}
