# @efficimo/dock

Detach any React panel into its own browser window — reactive, persistent, router-agnostic.

> This package is in early development. Contributions welcome.

## Live Demo

[https://efficimo.github.io/dock/](https://efficimo.github.io/dock/)

## Install

```bash
npm install @efficimo/dock
```

## Peer dependencies

| Package | Version |
|---|---|
| `react` | `>=18.0.0` |
| `@efficimo/observable` | `>=0.1.0` |
| `@efficimo/storage` | `>=0.1.0` |

## Usage

```tsx
import { DockProvider, DockSlot } from "@efficimo/dock/react";

<DockProvider url="/dock" panels={{
  chat: { component: ChatPanel, title: "Chat", defaultSize: { width: 480, height: 640 } },
}}>
  <App />
</DockProvider>

// In your layout
<DockSlot id="chat" />

// In any component
const { detach, isDetached, canDetach } = useDock("chat");
{canDetach && <button onClick={() => detach()}>⧉</button>}
```

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

See [CONTRIBUTING.md](./CONTRIBUTING.md) — implementation PRs welcome.
