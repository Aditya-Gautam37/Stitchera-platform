"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { closeChatThread } from "@/lib/actions/chat";

export function CloseThreadButton({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await closeChatThread(threadId);
          router.refresh();
        });
      }}
      className="rounded border px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:hover:bg-zinc-900"
    >
      {isPending ? "Closing..." : "Close conversation"}
    </button>
  );
}
