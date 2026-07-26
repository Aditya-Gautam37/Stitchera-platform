"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendChatMessage } from "@/lib/actions/chat";
import { buttonClass } from "@/components/ui/styles";

export type ChatMessage = {
  id: number;
  sender_role: "customer" | "staff";
  body: string;
  created_at: string;
};

export function ChatWindow({
  threadId,
  initialMessages,
  viewerRole,
  emptyHint,
  disabled = false,
}: {
  threadId: string;
  initialMessages: ChatMessage[];
  viewerRole: "customer" | "staff";
  emptyHint: string;
  disabled?: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat-thread-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const row = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, row]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setError(null);
    setDraft("");
    startTransition(async () => {
      try {
        await sendChatMessage(threadId, text);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't send your message.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-96 flex-col gap-3 overflow-y-auto rounded border border-line bg-paper p-4">
        {!messages.length ? (
          <p className="m-auto text-sm text-ink-soft">{emptyHint}</p>
        ) : (
          messages.map((m) => {
            const isOwnSide = m.sender_role === viewerRole;
            return (
              <div
                key={m.id}
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  isOwnSide
                    ? "self-end bg-indigo text-paper"
                    : "self-start bg-cotton text-ink"
                }`}
              >
                {m.body}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-sm text-thread-red">{error}</p>}

      {disabled ? (
        <p className="text-sm text-ink-soft">This conversation is closed.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message..."
            maxLength={2000}
            className="flex-1 rounded-full border border-line px-4 py-2 text-sm text-ink"
          />
          <button
            type="submit"
            disabled={isPending || !draft.trim()}
            className={buttonClass("primary", "sm")}
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
