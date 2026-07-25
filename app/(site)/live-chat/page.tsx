import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChatWindow } from "@/components/chat/chat-window";

export default async function LiveChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-ink">Live chat</h1>
        <p className="mt-3 text-ink-soft">
          Sign in to chat with our support team.
        </p>
        <Link
          href="/login?next=/live-chat"
          className="mt-6 inline-block rounded-full bg-indigo px-5 py-2.5 text-sm font-medium text-paper hover:bg-indigo-strong"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const { data: threadId, error } = await supabase.rpc("get_or_create_chat_thread");

  if (error || !threadId) {
    console.error("[live-chat]", error);
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-ink">Live chat</h1>
        <p className="mt-3 text-ink-soft">
          Chat isn&apos;t available right now — reach us on{" "}
          <Link href="/contact" className="text-indigo underline">
            WhatsApp from the Contact page
          </Link>{" "}
          instead.
        </p>
      </div>
    );
  }

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("id, sender_role, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-ink">Live chat</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Our team typically replies within a few minutes during business hours.
      </p>
      <div className="mt-6">
        <ChatWindow
          threadId={threadId}
          initialMessages={messages ?? []}
          viewerRole="customer"
          emptyHint="Say hello — we're here to help."
        />
      </div>
    </div>
  );
}
