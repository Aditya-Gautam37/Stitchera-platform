"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { closeChatThread } from "@/lib/actions/chat";
import { adminButtonClass } from "@/components/ui/admin-styles";

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
      className={adminButtonClass("secondary", "sm")}
    >
      {isPending ? "Closing..." : "Close conversation"}
    </button>
  );
}
