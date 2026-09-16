import type { DockConfig, DockId } from "@efficimo/dock";
import { DockSlot, useDock, useDockMessages } from "@efficimo/dock/react";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { COLORS, createFallback, DockControls, PanelShell } from "../ui";
import type { Example } from "./types";

const CONSOLE = "logs-console";

type LogLine = { seq: number; time: string; text: string };

const ROUTES = ["/api/orders", "/api/users", "/api/cart", "/healthz", "/api/search"];
const VERBS = ["GET", "POST", "PATCH", "DELETE"];

function nextLine(seq: number): LogLine {
  const route = ROUTES[seq % ROUTES.length];
  const verb = VERBS[(seq * 7) % VERBS.length];
  const status = seq % 17 === 0 ? 500 : seq % 5 === 0 ? 404 : 200;
  return {
    seq,
    time: new Date().toLocaleTimeString(),
    text: `${verb} ${route} ${status} ${20 + ((seq * 13) % 300)}ms`,
  };
}

function statusColor(text: string): string {
  if (text.includes(" 500 ")) return COLORS.bad;
  if (text.includes(" 404 ")) return COLORS.warn;
  return COLORS.muted;
}

/**
 * The stream is produced by the panel itself, not by the page — so it keeps running in the
 * detached window while the main window is reloaded, or navigated to another example.
 */
function ConsolePanel(): ReactElement {
  const { send } = useDock(CONSOLE);
  const [lines, setLines] = useState<LogLine[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef(0);
  const sendRef = useRef(send);

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  useEffect(() => {
    const timer = setInterval(() => {
      seqRef.current += 1;
      const line = nextLine(seqRef.current);
      setLines((prev) => [...prev.slice(-200), line]);
      // Report to whoever is watching from another window.
      sendRef.current(line);
    }, 700);
    return () => clearInterval(timer);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: bottomRef is stable — only new lines scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return (
    <PanelShell
      title="🖥 Access log"
      aside={<DockControls id={CONSOLE} />}
      bodyStyle={{ background: "#1b1b20", fontFamily: "ui-monospace, monospace" }}
    >
      {lines.map((line) => (
        <div key={line.seq} style={{ fontSize: "0.72rem", color: "#c9c9d4", lineHeight: 1.6 }}>
          <span style={{ color: "#6b6b7c" }}>{line.time}</span>{" "}
          <span
            style={{
              color: statusColor(line.text) === COLORS.muted ? "#9fe0a8" : statusColor(line.text),
            }}
          >
            {line.text}
          </span>
        </div>
      ))}
      <div ref={bottomRef} />
    </PanelShell>
  );
}

/** Proof the detached window is alive: it keeps reporting even though nothing renders it here. */
function LiveReport({ id }: { id: DockId }): ReactElement {
  const [last, setLast] = useState<LogLine | null>(null);

  useDockMessages(
    id,
    useRef((payload: unknown) => {
      if (typeof payload === "object" && payload !== null && "seq" in payload) {
        setLast(payload as LogLine);
      }
    }).current,
  );

  if (!last) return <span style={{ fontSize: "0.75rem" }}>waiting for the first line…</span>;
  return (
    <span style={{ fontSize: "0.75rem", fontFamily: "ui-monospace, monospace" }}>
      {last.seq} lines · {last.text}
    </span>
  );
}

const panels: Record<DockId, DockConfig> = {
  [CONSOLE]: {
    component: ConsolePanel,
    fallback: createFallback("The console", LiveReport),
    title: "Access log",
    defaultSize: { width: 460, height: 420 },
  },
};

function Page(): ReactElement {
  return (
    <>
      <p>
        The console writes itself. Detach it, then reload this window or switch to another example —
        the window keeps streaming, and the placeholder above keeps counting the lines it reports
        back.
      </p>
      <DockSlot id={CONSOLE} />
    </>
  );
}

export const logsExample: Example = {
  id: "logs",
  title: "Log console",
  description: "A window that lives its own life",
  panels,
  Page,
};
