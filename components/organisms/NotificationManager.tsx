"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Bell, CheckCircle2, ExternalLink, Lock, Pencil, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import {
  createNotificationAction,
  deleteNotificationAction,
  updateNotificationAction,
  type NotificationInput,
} from "@/app/actions/notifications";
import { formatJakartaDateTime } from "@/utils/jakartaTime";

export interface SentNotification {
  id: string;
  title: string;
  body: string;
  linkUrl: string | null;
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
}

interface NotificationManagerProps {
  notifications: SentNotification[];
  canSend: boolean;
}

const cardClass =
  "bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-5 sm:p-6 shadow-xs";
const inputClass =
  "w-full px-3.5 py-2.5 bg-white dark:bg-zinc-950 border border-[#E4E4E7] dark:border-zinc-700/80 rounded-lg text-xs sm:text-sm text-[#18181b] dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden transition-colors disabled:opacity-60";

const EMPTY: NotificationInput = { title: "", body: "", linkUrl: "" };

/** Pratinjau tampilan satu notifikasi di lonceng website */
function NotificationPreview({ value }: { value: NotificationInput }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141518] shadow-sm p-3 space-y-1.5">
      <div className="flex items-start gap-2">
        <span className="mt-1.5 w-2 h-2 rounded-full bg-[#B22234] shrink-0" />
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 break-words">
            {value.title.trim() || "Judul pengumuman"}
          </p>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 whitespace-pre-line break-words">
            {value.body.trim() || "Isi pengumuman akan tampil di sini."}
          </p>
          {(value.linkUrl || "").trim() && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B22234]">
              Buka tautan <ExternalLink className="w-3 h-3" />
            </span>
          )}
          <p className="text-[10px] text-zinc-400">Baru saja</p>
        </div>
      </div>
    </div>
  );
}

function NotificationForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: NotificationInput;
  submitLabel: string;
  onSubmit: (value: NotificationInput) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState<NotificationInput>(initial);
  const [busy, setBusy] = useState(false);
  const set = (key: keyof NotificationInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValue((v) => ({ ...v, [key]: e.target.value }));

  const canSubmit = value.title.trim().length >= 3 && value.body.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await onSubmit(value);
    setBusy(false);
    if (ok && !onCancel) setValue(EMPTY);
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="flex justify-between text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
            Judul <span className="font-mono font-normal text-zinc-400">{value.title.length}/120</span>
          </span>
          <input
            type="text"
            value={value.title}
            onChange={set("title")}
            maxLength={120}
            placeholder="Mis. Jadwal wawancara sudah bisa dipilih"
            disabled={busy}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1">
          <span className="flex justify-between text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
            Isi pengumuman <span className="font-mono font-normal text-zinc-400">{value.body.length}/2000</span>
          </span>
          <textarea
            value={value.body}
            onChange={set("body")}
            maxLength={2000}
            rows={5}
            placeholder="Tulis informasi untuk calon anggota..."
            disabled={busy}
            className={`${inputClass} resize-y min-h-[110px]`}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">Link (opsional)</span>
          <input
            type="url"
            value={value.linkUrl || ""}
            onChange={set("linkUrl")}
            maxLength={300}
            placeholder="https://..."
            disabled={busy}
            className={inputClass}
          />
        </label>
        <div className="flex flex-wrap justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="secondary" size="md" onClick={onCancel} disabled={busy} icon={<X className="w-4 h-4" />}>
              Batal
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={busy}
            disabled={busy || !canSubmit}
            icon={<Send className="w-4 h-4" />}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Pratinjau di lonceng website</p>
        <NotificationPreview value={value} />
      </div>
    </form>
  );
}

export function NotificationManager({ notifications, canSend }: NotificationManagerProps) {
  const router = useRouter();
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const showResult = (type: "success" | "error", message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert((curr) => (curr?.message === message ? null : curr)), 4000);
    if (type === "success") router.refresh();
  };

  const handleCreate = async (value: NotificationInput) => {
    const res = await createNotificationAction(value);
    if (!res.success) {
      showResult("error", res.error || "Gagal mengirim pengumuman.");
      return false;
    }
    showResult("success", "Pengumuman terkirim. Calon anggota akan melihatnya di lonceng notifikasi.");
    return true;
  };

  const handleUpdate = (id: string) => async (value: NotificationInput) => {
    const res = await updateNotificationAction(id, value);
    if (!res.success) {
      showResult("error", res.error || "Gagal mengubah pengumuman.");
      return false;
    }
    setEditingId(null);
    showResult("success", "Pengumuman diperbarui.");
    return true;
  };

  const handleDelete = async (n: SentNotification) => {
    if (!window.confirm(`Hapus pengumuman "${n.title}"? Pengumuman akan hilang dari lonceng semua calon anggota.`)) {
      return;
    }
    setDeletingId(n.id);
    const res = await deleteNotificationAction(n.id);
    setDeletingId(null);
    if (!res.success) {
      showResult("error", res.error || "Gagal menghapus pengumuman.");
      return;
    }
    showResult("success", "Pengumuman dihapus.");
  };

  return (
    <div className="space-y-6">
      <div className={`${cardClass} space-y-4`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FCF2F3] dark:bg-rose-950/30 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-[#B22234] dark:text-rose-400" />
          </div>
          <div className="space-y-1">
            <h1 className="text-base sm:text-lg font-bold text-[#18181b] dark:text-zinc-100">Notifikasi Calon Anggota</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Pengumuman yang dikirim di sini muncul di <strong>lonceng notifikasi</strong> pada navbar website untuk
              semua calon anggota yang login, lengkap dengan badge jumlah yang belum dibaca.
            </p>
          </div>
        </div>

        {alert && (
          <div
            role="alert"
            className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs sm:text-sm ${
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
            <p className="font-medium">{alert.message}</p>
          </div>
        )}

        {canSend ? (
          <div className="pt-3 border-t border-[#E4E4E7] dark:border-zinc-800">
            <NotificationForm initial={EMPTY} submitLabel="Kirim ke Semua Calon Anggota" onSubmit={handleCreate} />
          </div>
        ) : (
          <p className="flex items-center gap-2 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            Role Anda tidak memiliki hak &quot;Kirim pengumuman&quot;. Anda hanya dapat melihat riwayatnya.
          </p>
        )}
      </div>

      <div className={`${cardClass} space-y-3`}>
        <div className="flex items-center gap-2">
          <h2 className="text-sm sm:text-base font-bold text-[#18181b] dark:text-zinc-100">Riwayat Pengumuman</h2>
          <span className="text-[11px] font-mono text-zinc-400">{notifications.length}</span>
        </div>

        {notifications.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-400">
            Belum ada pengumuman yang dikirim.
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800/80 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
            {notifications.map((n) =>
              editingId === n.id ? (
                <div key={n.id} className="p-4">
                  <NotificationForm
                    initial={{ title: n.title, body: n.body, linkUrl: n.linkUrl || "" }}
                    submitLabel="Simpan Perubahan"
                    onSubmit={handleUpdate(n.id)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div key={n.id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-[#18181b] dark:text-zinc-100 break-words">{n.title}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-line break-words">{n.body}</p>
                    {n.linkUrl && (
                      <a
                        href={n.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B22234] dark:text-rose-400 hover:underline break-all"
                      >
                        {n.linkUrl} <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    )}
                    <p className="text-[11px] text-zinc-400">
                      {formatJakartaDateTime(n.createdAt)}
                      {n.createdByName ? ` · oleh ${n.createdByName}` : ""}
                      {n.updatedAt !== n.createdAt ? " · diubah" : ""}
                    </p>
                  </div>
                  {canSend && (
                    <div className="flex gap-1.5 shrink-0 self-start">
                      <button
                        type="button"
                        onClick={() => setEditingId(n.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" /> Ubah
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(n)}
                        disabled={deletingId === n.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-rose-200 dark:border-rose-900 text-[11px] font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" /> Hapus
                      </button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
