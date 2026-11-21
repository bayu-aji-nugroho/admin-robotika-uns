"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle2, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import {
  assignLimitedRoleAction,
  revokeLimitedRoleAction,
  type AdminRoleItem,
  type RoleMemberItem,
} from "@/app/actions/roles";

const inputClass =
  "w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden";

/** Menu Role versi terbatas: tambah/cabut admin hanya untuk role yang boleh diberikan (mis. Teacher Magang). */
export function LimitedRoleManager({
  roles,
  initialMembers,
  currentEmail,
}: {
  roles: AdminRoleItem[];
  initialMembers: RoleMemberItem[];
  currentEmail?: string;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const roleName = (id: string | null) => roles.find((r) => r.id === id)?.name ?? "-";

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !roleId) return;
    setBusy(true);
    setAlert(null);
    const res = await assignLimitedRoleAction({ roleId, email, fullName });
    setBusy(false);
    if (!res.success || !res.data) {
      setAlert({ type: "error", message: res.error || "Gagal menambahkan admin." });
      return;
    }
    const member = res.data;
    setMembers((prev) => [...prev.filter((m) => m.id !== member.id), member]);
    setAlert({ type: "success", message: `${member.email} ditambahkan sebagai ${roleName(member.role_id)}.` });
    setEmail("");
    setFullName("");
  };

  const handleRevoke = async (member: RoleMemberItem) => {
    setBusy(true);
    setAlert(null);
    const res = await revokeLimitedRoleAction(member.id);
    setBusy(false);
    setConfirmId(null);
    if (!res.success) {
      setAlert({ type: "error", message: res.error || "Gagal mencabut akses." });
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
    setAlert({ type: "success", message: `Akses admin ${member.full_name || member.email} telah dicabut.` });
  };

  const card = "bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs";

  return (
    <div className="space-y-5">
      <div className={`${card} space-y-4`}>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-[#18181b] dark:text-zinc-100">Tambah Admin</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Anda hanya bisa memberi role: <strong>{roles.map((r) => r.name).join(", ") || "-"}</strong>. Role lain dan
            superadmin dikelola Ketua Umum, Wakil Ketua, atau Developer.
          </p>
        </div>

        {alert && (
          <div
            role="alert"
            className={`flex items-start gap-2 p-3 rounded-lg border text-xs sm:text-sm ${
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

        {roles.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Belum ada role yang boleh diberikan. Minta superadmin mencentang “Boleh diberikan admin lain” pada role terkait.
          </p>
        ) : (
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1 sm:col-span-2">
              <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Email (email apa saja) *</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email apa saja, mis. nama@gmail.com"
                className={inputClass}
              />
            </label>
            <label className="space-y-1">
              <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Nama</span>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Opsional" className={inputClass} />
            </label>
            <label className="space-y-1">
              <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Role</span>
              <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className={inputClass}>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" variant="primary" size="md" isLoading={busy} disabled={busy} icon={<UserPlus className="w-4 h-4" />}>
                Tambah Admin
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className={`${card} space-y-3`}>
        <h2 className="text-sm font-bold text-[#18181b] dark:text-zinc-100">
          Admin dengan role ini <span className="font-normal text-zinc-400">({members.length})</span>
        </h2>
        {members.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Belum ada.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {members.map((m) => (
              <li key={m.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{m.full_name || m.email}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {m.email} · {roleName(m.role_id)}
                  </p>
                </div>
                {m.email.toLowerCase() === currentEmail ? null : confirmId === m.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleRevoke(m)}
                      className="px-2 py-1 rounded bg-rose-600 text-white text-[11px] font-semibold hover:bg-rose-700 cursor-pointer disabled:opacity-50"
                    >
                      Cabut akses
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(m.id)}
                    title="Cabut akses admin"
                    className="p-1.5 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
