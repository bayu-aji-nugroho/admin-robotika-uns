"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, MailCheck, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { addApplicantEmailAction, removeApplicantEmailAction } from "@/app/actions/applicantEmailWhitelist";
import { formatJakartaDateTime } from "@/utils/jakartaTime";

export interface ApplicantEmailWhitelistItem {
  email: string;
  note: string | null;
  created_at: string;
  /** Sudah pernah login dengan email ini */
  has_account: boolean;
  /** Nama pendaftar bila sudah mengisi formulir */
  applicant_name: string | null;
}

interface ApplicantEmailWhitelistCardProps {
  items: ApplicantEmailWhitelistItem[];
  canEdit: boolean;
}

/** Pengecualian login SSO: email non-SSO yang boleh dipakai calon anggota (akun SSO bermasalah) */
export function ApplicantEmailWhitelistCard({ items, canEdit }: ApplicantEmailWhitelistCardProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("add");
    const res = await addApplicantEmailAction(email, note);
    setBusy(null);
    if (!res.success) {
      setAlert({ type: "error", text: res.error || "Gagal menambahkan email." });
      return;
    }
    setAlert({ type: "success", text: `${res.data} sekarang bisa login lewat "Masuk dengan akun email biasa".` });
    setEmail("");
    setNote("");
    router.refresh();
  };

  const handleRemove = async (target: string) => {
    if (!window.confirm(`Cabut pengecualian untuk ${target}? Email ini tidak bisa login lagi ke web pendaftaran.`)) return;
    setBusy(target);
    const res = await removeApplicantEmailAction(target);
    setBusy(null);
    if (!res.success) {
      setAlert({ type: "error", text: res.error || "Gagal menghapus email." });
      return;
    }
    setAlert({ type: "success", text: `Pengecualian ${target} dicabut.` });
    router.refresh();
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
      <div className="space-y-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-[#18181b] dark:text-zinc-100">
          <MailCheck className="w-4 h-4 text-[#B22234] dark:text-rose-400" />
          Pengecualian Login SSO
        </p>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Calon anggota wajib login dengan email SSO <strong>@student.uns.ac.id</strong>. Bila akun SSO seseorang
          bermasalah, daftarkan email penggantinya (mis. Gmail pribadi) di sini. Ia lalu login lewat tautan{" "}
          <em>&quot;Masuk dengan akun email biasa&quot;</em> di web pendaftaran. Email yang tidak ada di daftar ini
          tetap ditolak. Verifikasi NIM-nya secara manual.
        </p>
      </div>

      {alert && (
        <div
          role="alert"
          className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs ${
            alert.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          {alert.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <p className="font-medium break-all">{alert.text}</p>
        </div>
      )}

      {canEdit && (
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <div className="space-y-1">
            <label htmlFor="whitelist-email" className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
              Email pengganti
            </label>
            <input
              id="whitelist-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@gmail.com"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-[#18181b] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#B22234]/30"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="whitelist-note" className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
              Catatan (nama / NIM)
            </label>
            <input
              id="whitelist-note"
              type="text"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="mis. Budi - K3524xxx, SSO error"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-[#18181b] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#B22234]/30"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={busy === "add"}
            disabled={busy !== null || !email.trim()}
            icon={<Plus className="w-4 h-4" />}
          >
            Tambah
          </Button>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">Belum ada email pengecualian.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg">
          {items.map((item) => (
            <li key={item.email} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-semibold text-[#18181b] dark:text-zinc-100 break-all">{item.email}</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {item.note ? `${item.note} · ` : ""}
                  {item.applicant_name
                    ? `Sudah mendaftar: ${item.applicant_name}`
                    : item.has_account
                    ? "Sudah login, belum mengisi formulir"
                    : "Belum pernah login"}
                  {" · "}ditambahkan {formatJakartaDateTime(item.created_at)}
                </p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleRemove(item.email)}
                  disabled={busy !== null}
                  aria-label={`Hapus ${item.email}`}
                  className="shrink-0 p-2 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
