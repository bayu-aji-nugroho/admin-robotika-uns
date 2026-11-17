"use client";

import React, { useState } from "react";
import { Star } from "lucide-react";
import { setApplicantStarAction } from "@/app/actions/applicantStars";

interface StarToggleProps {
  applicantId: string;
  applicantName?: string | null;
  starred: boolean;
  starredByName?: string | null;
  /** false = hanya tampilkan (role Viewer) */
  canToggle: boolean;
  onChange?: (starred: boolean, starredByName: string | null) => void;
  /** "icon" = ikon kecil (tabel), "button" = tombol berlabel (detail) */
  variant?: "icon" | "button";
}

/** Bintang untuk menandai calon anggota potensial (dibagikan ke semua admin). */
export function StarToggle({
  applicantId,
  applicantName,
  starred,
  starredByName,
  canToggle,
  onChange,
  variant = "icon",
}: StarToggleProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = error
    ? error
    : starred
    ? `Potensial · diberi bintang oleh ${starredByName || "admin"}${canToggle ? " (klik untuk mencabut)" : ""}`
    : canToggle
    ? "Tandai sebagai calon potensial"
    : "Belum diberi bintang";

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!canToggle || busy) return;
    const next = !starred;
    setBusy(true);
    setError(null);
    onChange?.(next, next ? "Anda" : null); // optimistis
    const res = await setApplicantStarAction(applicantId, next);
    setBusy(false);
    if (!res.success) {
      onChange?.(starred, starredByName ?? null); // kembalikan
      setError(res.error || "Gagal memperbarui bintang.");
      return;
    }
    onChange?.(next, next ? res.starredByName ?? null : null);
  };

  const icon = (
    <Star
      className={`${variant === "icon" ? "w-4 h-4" : "w-3.5 h-3.5"} transition-colors ${
        starred ? "fill-amber-400 text-amber-500" : "text-zinc-300 dark:text-zinc-600"
      } ${canToggle && !starred ? "group-hover/star:text-amber-400" : ""}`}
      strokeWidth={2}
    />
  );

  if (variant === "button") {
    if (!canToggle && !starred) return null;
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={!canToggle || busy}
        aria-pressed={starred}
        title={title}
        className={`group/star inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-2xs transition-colors disabled:cursor-default ${
          starred
            ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300"
            : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer"
        } ${canToggle ? "cursor-pointer" : ""} ${busy ? "opacity-60" : ""}`}
      >
        {icon}
        {starred ? "Potensial" : "Beri Bintang"}
      </button>
    );
  }

  if (!canToggle) {
    return starred ? (
      <span title={title} className="inline-flex">
        {icon}
        <span className="sr-only">Calon potensial</span>
      </span>
    ) : null;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      // Enter/Spasi sudah memicu onClick; cukup cegah baris tabel ikut membuka detail
      onKeyDown={(e) => e.stopPropagation()}
      disabled={busy}
      aria-pressed={starred}
      aria-label={`${starred ? "Cabut bintang" : "Beri bintang"} ${applicantName || ""}`.trim()}
      title={title}
      className={`group/star inline-flex p-1 -m-1 rounded-md cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/30 ${busy ? "opacity-60" : ""}`}
    >
      {icon}
    </button>
  );
}
