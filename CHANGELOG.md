# Changelog

## 0.1.0 — Unreleased

Initial release.

- `DockProvider` / `DockSlot` / `DockOutlet` / `useDock` / `useDockMessages`.
- Detach a panel into its own window; the panel id and its params travel in the url hash,
  so no server route and no router integration are needed.
- Cross-window state and payloads over `BroadcastChannel`.
- Detached panels are remembered across reloads through `@efficimo/storage` (or a built-in
  `window.localStorage` adapter).
- A dock window heartbeats; the opener pulls the panel back inline when the heartbeat stops.
