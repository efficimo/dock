# @efficimo/dock

Detach any React panel into its own browser window — reactive, persistent, router-agnostic.

> This package is in early development. Contributions welcome.

## Live Demo

[https://efficimo.github.io/dock/](https://efficimo.github.io/dock/)

| Example | What it exercises |
|---|---|
| Chat | Messages between windows |
| Data inspector | Deep-linking through dock params |
| Log console | A window that keeps running on its own |
| Dashboard | Several panels out at once, restored after a reload |

Pages live in the query string (`?example=…`) and dock owns the hash, so the two never
collide. Panels are declared app-wide rather than per page — a detached panel survives
navigating to another example.

## Install

```bash
npm install @efficimo/dock
```

## Peer dependencies

| Package | Version |
|---|---|
| `react` | `>=18.0.0` |
| `@efficimo/observable` | `>=0.5.0` |
| `@efficimo/observable-react` | `>=0.5.0` |
| `@efficimo/storage` | `>=0.3.0` |

## Usage

```tsx
import { parseDockHash } from "@efficimo/dock";
import { DockOutlet, DockProvider, DockSlot, useDock } from "@efficimo/dock/react";

const PANELS = {
  chat: { component: ChatPanel, title: "Chat", defaultSize: { width: 480, height: 640 } },
};

// A window whose hash carries a panel id renders that panel alone.
const isDockWindow = parseDockHash(window.location.hash) !== null;

<DockProvider url="/" panels={PANELS}>
  {isDockWindow ? <DockOutlet /> : <App />}
</DockProvider>

// In your layout — renders the panel, or its fallback while it is detached
<DockSlot id="chat" />

// In any component
const { detach, isDetached, canDetach } = useDock("chat");
{canDetach && <button onClick={() => detach({ thread: "42" })}>⧉</button>}
```

`url` is where a detached panel is opened; the panel id and its params travel in the hash,
so a single static entry point is enough — no server route, no router integration.

### Talking between windows

A detached panel lives in its own document, so React state is not shared. Send payloads
over the dock channel instead — a sender never receives its own message:

```tsx
const { send } = useDock("chat");
useDockMessages("chat", (payload) => { /* sent by another window */ });
```

### Persistence

Detached panels are remembered across reloads. By default dock uses a `window.localStorage`
adapter; pass `storage` to share a store with the rest of your app:

```tsx
import { LocalStorage } from "@efficimo/storage";

<DockProvider url="/" panels={PANELS} storage={LocalStorage}>
```

`SessionStorage` works too, if you'd rather each tab remember its own detached panels.

A dock window heartbeats every second; the opener pulls a panel back inline when the
heartbeat stops — whether the window was closed, crashed or navigated away.

## Development

```bash
# Install lib dependencies
npm install

# Install demo dependencies
npm run install:demo

# Start the demo dev server
npm run dev
```

The `demo/` app imports the lib directly from `src/` via Vite aliases — no build step required during development.

## Contributing

Issues and pull requests are welcome on [GitHub](https://github.com/efficimo/dock).
Run `npm run lint`, `npm run typecheck` and `npm test` before opening one.
