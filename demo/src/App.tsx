import { parseDockHash } from "@efficimo/dock";
import { DockOutlet, DockProvider } from "@efficimo/dock/react";
import { type ReactElement, type ReactNode, useEffect, useState } from "react";
import { EXAMPLES, PANELS } from "./examples";
import { COLORS } from "./ui";

/**
 * Panels open on the app's own base url and carry their id in the hash, so a single static
 * entry point is enough — the demo works unchanged under GitHub Pages' `/dock/` base.
 */
const BASE_URL = import.meta.env.BASE_URL;

/** A window whose hash designates a panel renders that panel alone, whatever the query says. */
const IS_DOCK_WINDOW = parseDockHash(window.location.hash) !== null;

/** Pages live in the query string; the hash belongs to dock. The two never collide. */
const QUERY_KEY = "example";

function readExampleId(): string {
  const id = new URLSearchParams(window.location.search).get(QUERY_KEY);
  return EXAMPLES.some((example) => example.id === id) && id ? id : EXAMPLES[0].id;
}

/**
 * Every example's provider wraps the whole app, including a dock window: a detached panel
 * is rendered outside of any page and still needs the context its inline twin had.
 */
function withProviders(children: ReactNode): ReactNode {
  return EXAMPLES.reduceRight<ReactNode>((wrapped, example) => {
    const Provider = example.Provider;
    return Provider ? <Provider key={example.id}>{wrapped}</Provider> : wrapped;
  }, children);
}

function Sidebar({
  currentId,
  onSelect,
}: {
  currentId: string;
  onSelect: (id: string) => void;
}): ReactElement {
  return (
    <nav
      style={{
        width: 220,
        flex: "0 0 220px",
        borderRight: `1px solid ${COLORS.border}`,
        background: COLORS.soft,
        padding: "1.5rem 0",
      }}
    >
      <div style={{ padding: "0 1.25rem 1.25rem", fontWeight: 700 }}>@efficimo/dock</div>
      {EXAMPLES.map((example) => {
        const active = example.id === currentId;
        return (
          <button
            key={example.id}
            type="button"
            onClick={() => onSelect(example.id)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "0.6rem 1.25rem",
              border: "none",
              borderLeft: `3px solid ${active ? COLORS.accent : "transparent"}`,
              background: active ? "#fff" : "transparent",
              cursor: "pointer",
              font: "inherit",
            }}
          >
            <div style={{ fontWeight: active ? 600 : 400, fontSize: "0.88rem" }}>
              {example.title}
            </div>
            <div style={{ color: COLORS.muted, fontSize: "0.75rem", marginTop: "0.15rem" }}>
              {example.description}
            </div>
          </button>
        );
      })}
    </nav>
  );
}

function MainLayout(): ReactElement {
  const [currentId, setCurrentId] = useState(readExampleId);

  useEffect(() => {
    const syncFromUrl = () => setCurrentId(readExampleId());
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  const select = (id: string) => {
    // Client-side only: the registry is never touched, so panels stay detached across pages.
    window.history.pushState(null, "", `${BASE_URL}?${QUERY_KEY}=${id}`);
    setCurrentId(id);
  };

  const example = EXAMPLES.find((candidate) => candidate.id === currentId) ?? EXAMPLES[0];
  const Page = example.Page;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar currentId={example.id} onSelect={select} />
      <main style={{ flex: 1, padding: "2rem 2.5rem", maxWidth: 900 }}>
        <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.4rem" }}>{example.title}</h1>
        <Page />
      </main>
    </div>
  );
}

export function App(): ReactElement {
  return (
    <DockProvider url={BASE_URL} panels={PANELS}>
      {withProviders(IS_DOCK_WINDOW ? <DockOutlet /> : <MainLayout />)}
    </DockProvider>
  );
}
