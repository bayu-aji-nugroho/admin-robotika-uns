"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pin, PinOff } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

/** Superadmin: sematkan / lepas bagian Guide agar tampil paling atas untuk semua admin. */
export function GuidePinButton({ sectionId, pinned }: { sectionId: string; pinned: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setError(null);
    const { error: rpcError } = await createClient().rpc("set_guide_pin", {
      p_section: sectionId,
      p_pinned: !pinned,
    });
    if (rpcError) return setError(rpcError.message);
    startTransition(() => router.refresh());
  };

  const Icon = pinned ? PinOff : Pin;
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      title={error ?? (pinned ? "Lepas sematan" : "Sematkan ke paling atas")}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold cursor-pointer disabled:opacity-50 ${
        error
          ? "border-rose-300 text-rose-600"
          : pinned
            ? "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
            : "border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-[#B22234] hover:border-[#B22234]/40"
      }`}
    >
      <Icon className="w-3 h-3" />
      {pinned ? "Lepas" : "Sematkan"}
    </button>
  );
}
