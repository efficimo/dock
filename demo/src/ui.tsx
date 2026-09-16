import type { DockId } from "@efficimo/dock";
import { useDock } from "@efficimo/dock/react";
import type { ComponentType, CSSProperties, ReactElement, ReactNode } from "react";

export const COLORS = {
  border: "#dcdce0",
  soft: "#f4f4f6",
  muted: "#6b6b76",
  accent: "#2563eb",
  ok: "#16a34a",
  warn: "#d97706",
  bad: "#dc2626",
};

/** Every panel renders at the same size, so detaching never reflows the page. */
export const PANEL_SIZE = { width: 320, height: 300 };

const shell: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: PANEL_SIZE.width,
  height: PANEL_SIZE.height,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  overflow: "hidden",
  background: "#fff",
};

const header: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.5rem",
  padding: "0.45rem 0.7rem",
  background: COLORS.soft,
  borderBottom: `1px solid ${COLORS.border}`,
  fontWeight: 600,
  fontSize: "0.8rem",
};

/** Frame shared by every panel — attached, detached or in its own window. */
export function PanelShell({
  title,
  aside,
  children,
  bodyStyle,
}: {
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  bodyStyle?: CSSProperties;
}): ReactElement {
  return (
    <div style={shell}>
      <div style={header}>
        <span>{title}</span>
        {aside}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "0.6rem", ...bodyStyle }}>{children}</div>
    </div>
  );
}

export function Button({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "0.25rem 0.55rem",
        fontSize: "0.78rem",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 5,
        background: "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

/** Button pair every panel gets: detach when inline, focus/reattach when detached. */
export function DockControls({ id }: { id: DockId }): ReactElement {
  const { detach, reattach, focusWindow, canDetach, isDetached } = useDock(id);

  if (isDetached) {
    return (
      <span style={{ display: "flex", gap: "0.35rem" }}>
        <Button onClick={focusWindow}>Focus</Button>
        <Button onClick={reattach}>↩</Button>
      </span>
    );
  }
  return (
    <Button onClick={() => detach()} disabled={!canDetach}>
      ⧉
    </Button>
  );
}

/**
 * Builds the placeholder shown in place of a panel while it lives in its own window.
 * `Extra` lets an example keep reporting on what the detached window is doing.
 */
export function createFallback(
  label: string,
  Extra?: ComponentType<{ id: DockId }>,
): ComponentType<{ id: DockId }> {
  return function Fallback({ id }: { id: DockId }): ReactElement {
    return (
      <div style={{ ...shell, borderStyle: "dashed", background: COLORS.soft }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.6rem",
            color: COLORS.muted,
            fontSize: "0.82rem",
            textAlign: "center",
            padding: "0.8rem",
          }}
        >
          <span>⧉ {label} is in its own window</span>
          {Extra ? <Extra id={id} /> : null}
          <DockControls id={id} />
        </div>
      </div>
    );
  };
}
