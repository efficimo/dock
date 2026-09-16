import type { DockConfig, DockId } from "@efficimo/dock";
import { DockSlot, useDock, useDockMessages } from "@efficimo/dock/react";
import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { COLORS, createFallback, DockControls, PanelShell } from "../ui";
import type { Example } from "./types";

const DETAIL = "inspector-detail";

type Row = {
  id: string;
  service: string;
  env: string;
  status: "healthy" | "degraded" | "down";
  version: string;
  latency: number;
  owner: string;
};

const ROWS: Row[] = [
  {
    id: "d-1041",
    service: "api-gateway",
    env: "prod",
    status: "healthy",
    version: "2.14.0",
    latency: 42,
    owner: "platform",
  },
  {
    id: "d-1040",
    service: "billing",
    env: "prod",
    status: "degraded",
    version: "1.8.3",
    latency: 318,
    owner: "payments",
  },
  {
    id: "d-1039",
    service: "search",
    env: "prod",
    status: "healthy",
    version: "4.2.1",
    latency: 87,
    owner: "discovery",
  },
  {
    id: "d-1038",
    service: "notifier",
    env: "staging",
    status: "down",
    version: "0.9.0",
    latency: 0,
    owner: "growth",
  },
  {
    id: "d-1037",
    service: "media-worker",
    env: "prod",
    status: "healthy",
    version: "3.0.7",
    latency: 156,
    owner: "platform",
  },
  {
    id: "d-1036",
    service: "auth",
    env: "prod",
    status: "healthy",
    version: "5.1.2",
    latency: 29,
    owner: "identity",
  },
];

const STATUS_COLOR: Record<Row["status"], string> = {
  healthy: COLORS.ok,
  degraded: COLORS.warn,
  down: COLORS.bad,
};

type InspectorContextValue = { selectedId: string; select: (rowId: string) => void };

const InspectorContext = createContext<InspectorContextValue | null>(null);

function useInspector(): InspectorContextValue {
  const ctx = useContext(InspectorContext);
  if (!ctx) throw new Error("useInspector must be used within InspectorProvider");
  return ctx;
}

function readRowId(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const { rowId } = payload as { rowId?: unknown };
  return typeof rowId === "string" ? rowId : null;
}

/**
 * The selection is seeded from the dock params — that is how a window opened straight at
 * `#dock=inspector-detail&rowId=d-1040` knows what to show before any message arrives.
 */
function InspectorProvider({ children }: { children: ReactNode }): ReactElement {
  const { params, send } = useDock(DETAIL);
  const [selectedId, setSelectedId] = useState(params.rowId ?? ROWS[0].id);

  useDockMessages(
    DETAIL,
    useRef((payload: unknown) => {
      const rowId = readRowId(payload);
      if (rowId) setSelectedId(rowId);
    }).current,
  );

  const value = useMemo<InspectorContextValue>(
    () => ({
      selectedId,
      select: (rowId) => {
        setSelectedId(rowId);
        send({ rowId });
      },
    }),
    [selectedId, send],
  );

  return <InspectorContext.Provider value={value}>{children}</InspectorContext.Provider>;
}

function DetailPanel(): ReactElement {
  const { selectedId } = useInspector();
  const row = ROWS.find((candidate) => candidate.id === selectedId);

  return (
    <PanelShell title="🔎 Deployment" aside={<DockControls id={DETAIL} />}>
      {row ? (
        <dl style={{ margin: 0, fontSize: "0.82rem", lineHeight: 1.9 }}>
          {(
            [
              ["id", row.id],
              ["service", row.service],
              ["environment", row.env],
              ["version", row.version],
              ["p95 latency", row.latency === 0 ? "—" : `${row.latency} ms`],
              ["owner", row.owner],
            ] as const
          ).map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
              <dt style={{ color: COLORS.muted }}>{label}</dt>
              <dd style={{ margin: 0, fontFamily: "ui-monospace, monospace" }}>{value}</dd>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <dt style={{ color: COLORS.muted }}>status</dt>
            <dd style={{ margin: 0, color: STATUS_COLOR[row.status], fontWeight: 600 }}>
              {row.status}
            </dd>
          </div>
        </dl>
      ) : (
        <p style={{ color: COLORS.muted, fontSize: "0.82rem" }}>No deployment selected.</p>
      )}
    </PanelShell>
  );
}

function Table(): ReactElement {
  const { selectedId, select } = useInspector();
  const { detach, isDetached, canDetach } = useDock(DETAIL);

  return (
    <table style={{ borderCollapse: "collapse", fontSize: "0.82rem", minWidth: 380 }}>
      <thead>
        <tr style={{ textAlign: "left", color: COLORS.muted }}>
          <th style={{ padding: "0.3rem 0.5rem" }}>service</th>
          <th style={{ padding: "0.3rem 0.5rem" }}>env</th>
          <th style={{ padding: "0.3rem 0.5rem" }}>status</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {ROWS.map((row) => (
          <tr
            key={row.id}
            onClick={() => select(row.id)}
            style={{
              cursor: "pointer",
              background: row.id === selectedId ? "#e8f0ff" : "transparent",
              borderTop: `1px solid ${COLORS.border}`,
            }}
          >
            <td style={{ padding: "0.35rem 0.5rem", fontFamily: "ui-monospace, monospace" }}>
              {row.service}
            </td>
            <td style={{ padding: "0.35rem 0.5rem" }}>{row.env}</td>
            <td style={{ padding: "0.35rem 0.5rem", color: STATUS_COLOR[row.status] }}>
              {row.status}
            </td>
            <td style={{ padding: "0.35rem 0.5rem" }}>
              {!isDetached && canDetach && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    // Deep-link: the window opens already showing this row.
                    detach({ rowId: row.id });
                  }}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: COLORS.accent,
                    fontSize: "0.8rem",
                  }}
                >
                  ⧉ open
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const panels: Record<DockId, DockConfig> = {
  [DETAIL]: {
    component: DetailPanel,
    fallback: createFallback("The deployment detail"),
    title: "Deployment detail",
    defaultSize: { width: 360, height: 340 },
  },
};

function Page(): ReactElement {
  return (
    <>
      <p>
        Detach the detail panel with <code>⧉ open</code> on any row: the window is opened at
        <code> #dock=inspector-detail&rowId=…</code> and reads its own <code>params</code>. Keep
        clicking rows — the selection is pushed to the window that is already open.
      </p>
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        <Table />
        <DockSlot id={DETAIL} />
      </div>
    </>
  );
}

export const inspectorExample: Example = {
  id: "inspector",
  title: "Data inspector",
  description: "Deep-linking through dock params",
  panels,
  Provider: InspectorProvider,
  Page,
};
