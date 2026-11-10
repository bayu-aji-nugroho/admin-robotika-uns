"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, Save } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { saveWhatsappAction } from "@/app/actions/interviewSchedule";
import type { MemberAvailabilitySlot, ScheduleAdmin, ScheduledInterview } from "@/utils/interviewSchedule.types";

interface InterviewReadinessPanelProps {
  /** Pemilik kalender yang sedang dibuka */
  owner: ScheduleAdmin;
  isSelf: boolean;
  partner: ScheduleAdmin | null;
  memberAvailability: MemberAvailabilitySlot[];
  /** Sesi calon anggota (untuk cek lokasi yang belum dicatat) */
  scheduled: ScheduledInterview[];
  onResult: (type: "success" | "error", message: string) => void;
}

/** 6281234567890 -> +62 812-3456-7890 */
export function formatWhatsapp(phone: string) {
  const local = phone.replace(/^62/, "");
  const parts = [local.slice(0, 3), local.slice(3, 7), local.slice(7)].filter(Boolean);
  return `+62 ${parts.join("-")}`;
}

function CheckRow({ ok, label, children }: { ok: boolean; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-[11px]">
      {ok ? (
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-px text-emerald-600 dark:text-emerald-400" />
      ) : (
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px text-amber-500" />
      )}
      <span className="w-20 shrink-0 text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="min-w-0 text-zinc-700 dark:text-zinc-300">{children}</span>
    </div>
  );
}

function WhatsappForm({
  owner,
  isSelf,
  onResult,
}: {
  owner: ScheduleAdmin;
  isSelf: boolean;
  onResult: InterviewReadinessPanelProps["onResult"];
}) {
  const initial = owner.whatsapp ? `0${owner.whatsapp.slice(2)}` : "";
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    const res = await saveWhatsappAction(value, isSelf ? null : owner.id);
    setBusy(false);
    if (!res.success) {
      onResult("error", res.error || "Gagal menyimpan nomor WhatsApp.");
      return;
    }
    onResult("success", res.data ? "Nomor WhatsApp tersimpan." : "Nomor WhatsApp dihapus.");
  };

  return (
    <div className="flex gap-2">
      <input
        type="tel"
        inputMode="tel"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={30}
        placeholder="08xxxxxxxxxx"
        disabled={busy}
        aria-label="No. WhatsApp"
        className="flex-1 min-w-0 px-3 py-2 bg-white dark:bg-zinc-950 border border-[#E4E4E7] dark:border-zinc-700/80 rounded-lg text-xs text-[#18181b] dark:text-zinc-100 placeholder-zinc-400 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden transition-colors"
      />
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={handleSave}
        isLoading={busy}
        disabled={busy || value.trim() === initial}
        icon={<Save className="w-3.5 h-3.5" />}
      >
        Simpan
      </Button>
    </div>
  );
}

export function InterviewReadinessPanel({
  owner,
  isSelf,
  partner,
  memberAvailability,
  scheduled,
  onResult,
}: InterviewReadinessPanelProps) {
  const [nowMs] = useState(() => Date.now());

  const upcomingOf = (adminId: string) =>
    memberAvailability.filter((s) => s.adminId === adminId && new Date(s.startAt).getTime() > nowMs);
  const ownerSlots = upcomingOf(owner.id);
  const partnerSlots = partner ? upcomingOf(partner.id) : [];
  const partnerTimes = new Set(partnerSlots.map((s) => new Date(s.startAt).getTime()));
  const matchCount = ownerSlots.filter((s) => partnerTimes.has(new Date(s.startAt).getTime())).length;

  const ownerSessions = scheduled.filter(
    (s) => s.interviewerIds.includes(owner.id) && new Date(s.startAt).getTime() > nowMs
  );
  const missingLocation = ownerSessions.filter((s) => !s.location).length;

  const ready =
    Boolean(partner) && Boolean(owner.whatsapp) && Boolean(partner?.whatsapp) && matchCount > 0;

  const people = [
    { admin: owner, slots: ownerSlots, role: isSelf ? "Anda" : "Pemilik kalender", editable: true },
    ...(partner ? [{ admin: partner, slots: partnerSlots, role: "Pasangan", editable: false }] : []),
  ];

  return (
    <div className="space-y-3 pt-3 border-t border-[#E4E4E7] dark:border-zinc-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Kelengkapan Pasangan</p>
        <span
          className={`self-start sm:self-auto px-2 py-0.5 rounded-md border text-[11px] font-semibold ${
            ready
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
          }`}
        >
          {ready
            ? `Siap: ${matchCount} sesi bisa dipesan calon anggota`
            : !partner
            ? "Belum berpasangan"
            : "Belum lengkap"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {people.map(({ admin, slots, role, editable }) => (
          <div
            key={admin.id}
            className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[#18181b] dark:text-zinc-100 truncate">{admin.name}</p>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{role}</span>
            </div>

            <CheckRow ok={Boolean(admin.whatsapp)} label="WhatsApp">
              {admin.whatsapp ? (
                <a
                  href={`https://wa.me/${admin.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  {formatWhatsapp(admin.whatsapp)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-amber-700 dark:text-amber-400">Belum diisi</span>
              )}
            </CheckRow>
            <CheckRow ok={slots.length > 0} label="Kalender">
              {slots.length > 0 ? `${slots.length} slot terisi` : "Belum mengisi jadwal"}
            </CheckRow>

            {editable && <WhatsappForm key={admin.whatsapp || "none"} owner={admin} isSelf={isSelf} onResult={onResult} />}
          </div>
        ))}
      </div>

      {partner && (
        <CheckRow ok={matchCount > 0} label="Jam cocok">
          {matchCount > 0
            ? `${matchCount} sesi (${matchCount * 30} menit) sama-sama kosong`
            : "Belum ada jam yang sama-sama kosong"}
        </CheckRow>
      )}
      {ownerSessions.length > 0 && (
        <CheckRow ok={missingLocation === 0} label="Lokasi sesi">
          {missingLocation === 0
            ? `Semua ${ownerSessions.length} sesi sudah ada lokasinya`
            : `${missingLocation} dari ${ownerSessions.length} sesi belum dicatat lokasinya (isi di Jadwal Calon Anggota)`}
        </CheckRow>
      )}
      <p className="text-[11px] text-zinc-400">
        Nomor WhatsApp hanya ditampilkan ke calon anggota yang memilih jadwal dengan pasangan Anda, sebagai tombol
        konfirmasi otomatis.
      </p>
    </div>
  );
}
