"use client";

import React, { useState } from "react";
import { Check, HeartHandshake, Send, ShieldCheck, Unlink, UserPlus, X } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import {
  createPairAction,
  invitePartnerAction,
  leavePairAction,
  respondInviteAction,
} from "@/app/actions/interviewSchedule";
import type { InterviewPair, ScheduleAdmin, ScheduleViewer } from "@/utils/interviewSchedule.types";

interface InterviewPairPanelProps {
  viewer: ScheduleViewer;
  admins: ScheduleAdmin[];
  pairs: InterviewPair[];
  onResult: (type: "success" | "error", message: string) => void;
}

const selectClass =
  "w-full px-3 py-2.5 bg-white dark:bg-zinc-950 border border-[#E4E4E7] dark:border-zinc-700/80 rounded-lg text-xs sm:text-sm text-[#18181b] dark:text-zinc-100 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden cursor-pointer";

function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  disabled,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 p-1 rounded-md border border-rose-200 dark:border-rose-800">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setConfirming(false);
            onConfirm();
          }}
          className="px-2 py-0.5 rounded bg-rose-600 text-white text-[11px] font-semibold hover:bg-rose-700 cursor-pointer"
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold hover:bg-zinc-300 cursor-pointer"
        >
          Batal
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer disabled:opacity-50"
    >
      <Unlink className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

export function InterviewPairPanel({ viewer, admins, pairs, onResult }: InterviewPairPanelProps) {
  const [busy, setBusy] = useState(false);
  const [inviteTarget, setInviteTarget] = useState("");
  const [createA, setCreateA] = useState("");
  const [createB, setCreateB] = useState("");

  const nameOf = (id: string) => admins.find((a) => a.id === id)?.name || "-";
  const pairedIds = new Set(pairs.flatMap((p) => [p.memberA, p.memberB]));
  const freeAdmins = admins.filter((a) => a.eligible && !pairedIds.has(a.id));

  const myPair = pairs.find((p) => p.memberA === viewer.adminId || p.memberB === viewer.adminId);
  const partnerId = myPair
    ? myPair.memberA === viewer.adminId
      ? myPair.memberB
      : myPair.memberA
    : null;

  const run = async (
    fn: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string
  ) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    onResult(res.success ? "success" : "error", res.success ? successMessage : res.error || "Terjadi kesalahan.");
    return res.success;
  };

  return (
    <div className="space-y-4">
      {/* Status pasangan saya */}
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 space-y-3">
        <div className="flex items-center gap-2">
          <HeartHandshake className="w-4 h-4 text-[#B22234] dark:text-rose-400" />
          <h2 className="text-sm font-bold text-[#18181b] dark:text-zinc-100">Pasangan Pewawancara Saya</h2>
        </div>

        {myPair?.status === "active" && partnerId ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
              Anda berpasangan dengan <strong className="text-[#18181b] dark:text-zinc-100">{nameOf(partnerId)}</strong>.
              Kalender di bawah adalah kalender bersama kalian.
            </p>
            <ConfirmButton
              label="Putus pasangan"
              confirmLabel="Putus"
              disabled={busy}
              onConfirm={() => run(() => leavePairAction(myPair.id), "Pasangan telah diputus.")}
            />
          </div>
        ) : myPair?.status === "pending" && myPair.memberA === viewer.adminId ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
              Menunggu <strong>{nameOf(myPair.memberB)}</strong> menerima undangan Anda.
            </p>
            <ConfirmButton
              label="Batalkan undangan"
              confirmLabel="Batalkan"
              disabled={busy}
              onConfirm={() => run(() => leavePairAction(myPair.id), "Undangan dibatalkan.")}
            />
          </div>
        ) : myPair?.status === "pending" ? (
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60">
            <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200">
              <strong>{nameOf(myPair.memberA)}</strong> mengajak Anda menjadi pasangan pewawancara.
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={busy}
                icon={<Check className="w-3.5 h-3.5" />}
                onClick={() => run(() => respondInviteAction(myPair.id, true), "Undangan diterima. Kalian sekarang berpasangan.")}
              >
                Terima
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                icon={<X className="w-3.5 h-3.5" />}
                onClick={() => run(() => respondInviteAction(myPair.id, false), "Undangan ditolak.")}
              >
                Tolak
              </Button>
            </div>
          </div>
        ) : viewer.canSchedule ? (
          <div className="space-y-2">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Anda belum punya pasangan. Pilih admin yang juga belum berpasangan, lalu kirim undangan.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={inviteTarget}
                onChange={(e) => setInviteTarget(e.target.value)}
                className={selectClass}
                disabled={busy}
              >
                <option value="">-- Pilih admin --</option>
                {freeAdmins
                  .filter((a) => a.id !== viewer.adminId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
              <Button
                type="button"
                variant="primary"
                size="md"
                disabled={busy || !inviteTarget}
                isLoading={busy}
                icon={<Send className="w-4 h-4" />}
                className="shrink-0"
                onClick={async () => {
                  const ok = await run(() => invitePartnerAction(inviteTarget), "Undangan terkirim.");
                  if (ok) setInviteTarget("");
                }}
              >
                Kirim Undangan
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Role Anda tidak memiliki akses &quot;Jadwal wawancara&quot;.
          </p>
        )}
      </div>

      {/* Superadmin: kelola semua pasangan */}
      {viewer.isSuperadmin && (
        <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-[#18181b] dark:text-zinc-100">Semua Pasangan (Superadmin)</h2>
            <span className="text-[11px] font-mono text-zinc-400">{pairs.length} pasangan</span>
          </div>

          {pairs.length === 0 ? (
            <p className="text-xs text-zinc-400">Belum ada pasangan.</p>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800/80 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
              {pairs.map((p) => (
                <div key={p.id} className="p-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs sm:text-sm font-semibold text-[#18181b] dark:text-zinc-100 truncate">
                      {nameOf(p.memberA)} &amp; {nameOf(p.memberB)}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                        p.status === "active"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                          : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                      }`}
                    >
                      {p.status === "active" ? "Aktif" : "Menunggu"}
                    </span>
                  </div>
                  <ConfirmButton
                    label="Putus"
                    confirmLabel="Putus"
                    disabled={busy}
                    onConfirm={() => run(() => leavePairAction(p.id), "Pasangan telah diputus.")}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 pt-1">
            <p className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
              Bentuk pasangan langsung (tanpa undangan)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
              <select value={createA} onChange={(e) => setCreateA(e.target.value)} className={selectClass} disabled={busy}>
                <option value="">-- Admin pertama --</option>
                {freeAdmins.filter((a) => a.id !== createB).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <select value={createB} onChange={(e) => setCreateB(e.target.value)} className={selectClass} disabled={busy}>
                <option value="">-- Admin kedua --</option>
                {freeAdmins.filter((a) => a.id !== createA).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="primary"
                size="md"
                disabled={busy || !createA || !createB}
                icon={<UserPlus className="w-4 h-4" />}
                onClick={async () => {
                  const ok = await run(() => createPairAction(createA, createB), "Pasangan berhasil dibentuk.");
                  if (ok) {
                    setCreateA("");
                    setCreateB("");
                  }
                }}
              >
                Bentuk
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
