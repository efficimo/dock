import type { DockConfig, DockId } from "@efficimo/dock";
import { DockSlot, useDock, useDockMessages } from "@efficimo/dock/react";
import {
  createContext,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { COLORS, createFallback, DockControls, PanelShell } from "../ui";
import type { Example } from "./types";

const ALICE = "chat-alice";
const BOB = "chat-bob";

type Message = { from: DockId; text: string };

type ChatContextValue = {
  messages: Message[];
  send: (from: DockId, text: string) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}

function isMessage(payload: unknown): payload is Message {
  if (typeof payload !== "object" || payload === null) return false;
  const { from, text } = payload as Partial<Message>;
  return typeof from === "string" && typeof text === "string";
}

/**
 * Each window keeps its own copy of the conversation: it appends what it sends, and dock
 * broadcasts the payload to the others — a sender never receives its own message back.
 */
function ChatProvider({ children }: { children: ReactNode }): ReactElement {
  const [messages, setMessages] = useState<Message[]>([]);
  const alice = useDock(ALICE);
  const bob = useDock(BOB);

  const receive = useRef((payload: unknown) => {
    if (isMessage(payload)) setMessages((prev) => [...prev, payload]);
  }).current;

  useDockMessages(ALICE, receive);
  useDockMessages(BOB, receive);

  const value = useMemo<ChatContextValue>(
    () => ({
      messages,
      send: (from, text) => {
        const message: Message = { from, text };
        setMessages((prev) => [...prev, message]);
        (from === ALICE ? alice : bob).send(message);
      },
    }),
    [messages, alice, bob],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

function ChatPanel({ id, label }: { id: DockId; label: string }): ReactElement {
  const { messages, send } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: bottomRef is stable — only new messages scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || !input.trim()) return;
    send(id, input.trim());
    setInput("");
  };

  return (
    <PanelShell
      title={`💬 ${label}`}
      aside={<DockControls id={id} />}
      bodyStyle={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}
    >
      {messages.map((message, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: messages have no stable id in this demo
          key={`${message.from}-${index}`}
          style={{
            padding: "0.3rem 0.6rem",
            background: message.from === id ? "#d8e8ff" : COLORS.soft,
            borderRadius: 12,
            alignSelf: message.from === id ? "flex-end" : "flex-start",
            maxWidth: "85%",
            fontSize: "0.85rem",
          }}
        >
          {message.text}
        </div>
      ))}
      <div ref={bottomRef} />
      <input
        type="text"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Press Enter to send…"
        style={{
          marginTop: "auto",
          padding: "0.35rem 0.55rem",
          border: `1px solid ${COLORS.border}`,
          borderRadius: 5,
          boxSizing: "border-box",
        }}
      />
    </PanelShell>
  );
}

const panels: Record<DockId, DockConfig> = {
  [ALICE]: {
    component: () => <ChatPanel id={ALICE} label="Alice" />,
    fallback: createFallback("Alice"),
    title: "Alice",
    defaultSize: { width: 380, height: 460 },
  },
  [BOB]: {
    component: () => <ChatPanel id={BOB} label="Bob" />,
    fallback: createFallback("Bob"),
    title: "Bob",
    defaultSize: { width: 380, height: 460 },
  },
};

function Page(): ReactElement {
  return (
    <>
      <p>
        Two panels, one conversation. Detach either one and keep talking — payloads travel over the
        dock channel, so the windows stay in sync.
      </p>
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        <DockSlot id={ALICE} />
        <DockSlot id={BOB} />
      </div>
    </>
  );
}

export const chatExample: Example = {
  id: "chat",
  title: "Chat",
  description: "Messages between windows",
  panels,
  Provider: ChatProvider,
  Page,
};
