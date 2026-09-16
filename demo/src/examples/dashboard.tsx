import type { DockConfig, DockId } from "@efficimo/dock";
import { DockSlot, useDock } from "@efficimo/dock/react";
import { type ReactElement, useEffect, useState } from "react";
import { Button, COLORS, createFallback, DockControls, PanelShell } from "../ui";
import type { Example } from "./types";

type Tile = {
  id: DockId;
  label: string;
  unit: string;
  scale: number;
  color: string;
};

const TILES: Tile[] = [
  { id: "dash-traffic", label: "Traffic", unit: "req/s", scale: 1200, color: COLORS.accent },
  { id: "dash-revenue", label: "Revenue", unit: "€/min", scale: 480, color: COLORS.ok },
  { id: "dash-errors", label: "Error rate", unit: "%", scale: 4, color: COLORS.bad },
  { id: "dash-latency", label: "p95 latency", unit: "ms", scale: 320, color: COLORS.warn },
];

const POINTS = 32;

/**
 * Deterministic series keyed on the wall clock, so every window — attached or detached,
 * whenever it was opened — draws exactly the same curve.
 */
function noise(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function seriesAt(id: DockId, tick: number): number[] {
  const offset = [...id].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return Array.from({ length: POINTS }, (_, index) => {
    const step = tick - (POINTS - 1 - index);
    return (noise(offset + step) + noise(offset + step / 4) * 2) / 3;
  });
}

function useTick(): number {
  const [tick, setTick] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = setInterval(() => setTick(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  return tick;
}

function Sparkline({ values, color }: { values: number[]; color: string }): ReactElement {
  const width = 280;
  const height = 90;
  const path = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - value * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "auto", display: "block" }}
      role="img"
      aria-label="sparkline"
    >
      <path d={`${path} L${width},${height} L0,${height} Z`} fill={color} opacity={0.12} />
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

function TilePanel({ tile }: { tile: Tile }): ReactElement {
  const tick = useTick();
  const values = seriesAt(tile.id, tick);
  const current = values[values.length - 1] * tile.scale;

  return (
    <PanelShell title={tile.label} aside={<DockControls id={tile.id} />}>
      <div style={{ fontSize: "1.6rem", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
        {current.toFixed(tile.scale < 10 ? 2 : 0)}
        <span style={{ fontSize: "0.8rem", color: COLORS.muted, marginLeft: "0.3rem" }}>
          {tile.unit}
        </span>
      </div>
      <Sparkline values={values} color={tile.color} />
    </PanelShell>
  );
}

const panels: Record<DockId, DockConfig> = Object.fromEntries(
  TILES.map((tile) => [
    tile.id,
    {
      component: () => <TilePanel tile={tile} />,
      fallback: createFallback(tile.label),
      title: `${tile.label} — dashboard`,
      defaultSize: { width: 340, height: 300 },
    } satisfies DockConfig,
  ]),
);

function DetachAll(): ReactElement {
  // One call per tile rather than a loop — the tile list is fixed, and hooks stay top-level.
  const docks = [
    useDock(TILES[0].id),
    useDock(TILES[1].id),
    useDock(TILES[2].id),
    useDock(TILES[3].id),
  ];
  const detachable = docks.filter((dock) => dock.canDetach && !dock.isDetached);
  const detached = docks.filter((dock) => dock.isDetached);

  return (
    <div style={{ display: "flex", gap: "0.5rem", margin: "0 0 1.25rem" }}>
      <Button
        onClick={() => {
          for (const dock of detachable) dock.detach();
        }}
        disabled={detachable.length === 0}
      >
        ⧉ Detach all ({detachable.length})
      </Button>
      <Button
        onClick={() => {
          for (const dock of detached) dock.reattach();
        }}
        disabled={detached.length === 0}
      >
        ↩ Reattach all ({detached.length})
      </Button>
    </div>
  );
}

function Page(): ReactElement {
  return (
    <>
      <p>
        Spread the tiles over a second screen, then reload this window: every tile that was out
        comes back out. The curves are keyed on the clock, so all windows agree.
      </p>
      <DetachAll />
      <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
        {TILES.map((tile) => (
          <DockSlot key={tile.id} id={tile.id} />
        ))}
      </div>
    </>
  );
}

export const dashboardExample: Example = {
  id: "dashboard",
  title: "Dashboard",
  description: "Several panels out at once",
  panels,
  Page,
};
