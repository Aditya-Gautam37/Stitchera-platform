"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/dal/staff";
import { createClient } from "@/lib/supabase/server";

const STAFF_REPLY_ROLES = ["admin", "city_manager"];

export async function sendChatMessage(threadId: string, body: string) {
  const text = body.trim();
  if (!text) return;
  if (text.length > 2000) {
    throw new Error("Message is too long — please keep it under 2000 characters.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Which side of the conversation this message is on is derived from the
  // sender's real role, never taken from the client — the RLS insert
  // policies (0013) independently re-check this same thing, so this isn't
  // the security boundary, just what decides which bubble style renders.
  const senderRole = profile && STAFF_REPLY_ROLES.includes(profile.role)
    ? "staff"
    : "customer";

  const { error } = await supabase.from("chat_messages").insert({
    thread_id: threadId,
    sender_id: user.id,
    sender_role: senderRole,
    body: text,
  });

  if (error) {
    console.error("[send-chat-message]", error);
    throw new Error("Couldn't send your message. Please try again.");
  }

  if (senderRole === "staff") {
    revalidatePath("/admin/chat");
  }
}

export async function closeChatThread(threadId: string) {
  const profile = await requireStaff();
  if (profile.role === "pickup_agent") throw new Error("Not authorized");

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("chat_threads")
    .update({ status: "closed" })
    .eq("id", threadId)
    .select("id")
    .single();

  if (error || !updated) {
    console.error("[close-chat-thread]", error);
    throw new Error("Couldn't close this thread — you may not have access to it.");
  }

  revalidatePath("/admin/chat");
}
