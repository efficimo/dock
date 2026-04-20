import type { DockId } from "@efficimo/dock";
import { DockProvider, DockSlot, useDock } from "@efficimo/dock/react";
import { createContext, type ReactElement, useContext, useState } from "react";
import { ChatPanel, type Message } from "./panels/ChatPanel";

type MessagesContextValue = {
  messages: Message[];
  send: (from: DockId, text: string) => void;
};

const MessagesContext = createContext<MessagesContextValue | null>(null);

function useMessages(): MessagesContextValue {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error("useMessages must be used within MessagesContext.Provider");
  return ctx;
}

function AlicePanel(): ReactElement {
  const { messages, send } = useMessages();
  return <ChatPanel id="alice" messages={messages} onSend={(text) => send("alice", text)} />;
}

function BobPanel(): ReactElement {
  const { messages, send } = useMessages();
  return <ChatPanel id="bob" messages={messages} onSend={(text) => send("bob", text)} />;
}

const PANELS = {
  alice: { component: AlicePanel, title: "Alice", defaultSize: { width: 400, height: 480 } },
  bob: { component: BobPanel, title: "Bob", defaultSize: { width: 400, height: 480 } },
};

function PanelActions({ id }: { id: DockId }): ReactElement {
  const { detach, reattach, canDetach, isDetached } = useDock(id);
  if (isDetached) {
    return (
      <button type="button" onClick={reattach}>
        ↩ Reattach
      </button>
    );
  }
  return (
    <button type="button" onClick={() => detach()} disabled={!canDetach}>
      ⧉ Detach
    </button>
  );
}

export function App(): ReactElement {
  const [messages, setMessages] = useState<Message[]>([]);

  const send = (from: DockId, text: string) => {
    setMessages((prev) => [...prev, { from, text }]);
  };

  return (
    <MessagesContext.Provider value={{ messages, send }}>
      <DockProvider url="/dock" panels={PANELS}>
        <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
          <h1>@efficimo/dock</h1>
          <p>Detach any React panel into its own browser window.</p>
          <div style={{ display: "flex", gap: "2rem", marginTop: "2rem" }}>
            {(Object.keys(PANELS) as DockId[]).map((id) => (
              <section key={id}>
                <PanelActions id={id} />
                <DockSlot id={id} />
              </section>
            ))}
          </div>
        </main>
      </DockProvider>
    </MessagesContext.Provider>
  );
}
