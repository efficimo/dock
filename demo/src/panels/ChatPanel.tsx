import { type KeyboardEvent, type ReactElement, useEffect, useRef, useState } from "react";

export type Message = { from: string; text: string };

type Props = {
  id: string;
  messages: Message[];
  onSend: (text: string) => void;
};

export function ChatPanel({ id, messages, onSend }: Props): ReactElement {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: bottomRef is a stable ref — only messages triggers the scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      onSend(input.trim());
      setInput("");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "320px",
        width: "300px",
        border: "1px solid #ddd",
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "0.5rem 0.75rem",
          background: "#f0f0f0",
          fontWeight: 600,
          fontSize: "0.85rem",
          borderBottom: "1px solid #ddd",
        }}
      >
        💬 {id}
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
        }}
      >
        {messages.map((msg, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: messages have no stable id in this demo
            key={`${msg.from}-${i}`}
            style={{
              padding: "0.3rem 0.6rem",
              background: msg.from === id ? "#d1e7ff" : "#f0f0f0",
              borderRadius: 12,
              alignSelf: msg.from === id ? "flex-end" : "flex-start",
              maxWidth: "80%",
              fontSize: "0.9rem",
            }}
          >
            {msg.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "0.5rem", borderTop: "1px solid #ddd" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Press Enter to send…"
          style={{
            width: "100%",
            padding: "0.4rem 0.6rem",
            borderRadius: 4,
            border: "1px solid #ccc",
            boxSizing: "border-box",
          }}
        />
      </div>
    </div>
  );
}
