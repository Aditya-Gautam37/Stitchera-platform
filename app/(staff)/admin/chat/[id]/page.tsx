import { notFound, redirect } from "next/navigation";
import { requireStaff } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";
import { ChatWindow } from "@/components/chat/chat-window";
import { CloseThreadButton } from "./close-thread-button";

export default async function AdminChatThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireStaff();
  if (profile.role === "pickup_agent") redirect("/admin");

  const { id } = await params;
  const supabase = await createClient();

  const { data: thread } = await supabase
    .from("chat_threads")
    .select("id, status, customer_id")
    .eq("id", id)
    .single();

  if (!thread) notFound();

  const { data: customer } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", thread.customer_id)
    .single();

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("id, sender_role, body, created_at")
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: true });

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {customer?.full_name || customer?.phone || "Customer"}
          </h1>
          <p className="text-sm text-zinc-500">{customer?.phone}</p>
        </div>
        {thread.status === "open" && <CloseThreadButton threadId={thread.id} />}
      </div>

      <ChatWindow
        threadId={thread.id}
        initialMessages={messages ?? []}
        viewerRole="staff"
        emptyHint="No messages yet."
        disabled={thread.status !== "open"}
      />
    </div>
  );
}
