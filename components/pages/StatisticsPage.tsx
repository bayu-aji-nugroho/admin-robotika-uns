"use client";

import React, { useState } from "react";
import { AlertCircle, BarChart3 } from "lucide-react";

export interface DivisionStat {
  id: string;
  name: string;
  category: string;
  p1_submitted: number;
  p2_submitted: number;
  p1_all: number;
  p2_all: number;
}

export interface ApplicantStatistics {
  totals: { submitted: number; draft: number; booked: number; interviewed: number };
  divisions: DivisionStat[];
}

interface StatisticsPageProps {
  stats: ApplicantStatistics | null;
  error?: string | null;
}

type Scope = "submitted" | "all";
type GroupKey = "werkudara" | "cakrawala" | "nonteknis";

// Palet kategorikal 3 slot (biru, oranye, aqua), tervalidasi CVD untuk mode terang & gelap.
// Kelas ditulis utuh agar terbaca Tailwind.
const GROUPS: { key: GroupKey; label: string; stroke: string; fill: string }[] = [
  { key: "werkudara", label: "Werkudara", stroke: "stroke-[#2a78d6] dark:stroke-[#3987e5]", fill: "bg-[#2a78d6] dark:bg-[#3987e5]" },
  { key: "cakrawala", label: "Cakrawala", stroke: "stroke-[#eb6834] dark:stroke-[#d95926]", fill: "bg-[#eb6834] dark:bg-[#d95926]" },
  { key: "nonteknis", label: "Non-teknis", stroke: "stroke-[#1baf7a] dark:stroke-[#199e70]", fill: "bg-[#1baf7a] dark:bg-[#199e70]" },
];

function groupOf(d: DivisionStat): GroupKey {
  if (d.id.startsWith("werkudara")) return "werkudara";
  if (d.id.startsWith("cakrawala")) return "cakrawala";
  return "nonteknis";
}

/** Nama ringkas: "Werkudara - Pemrograman" -> "Pemrograman" (tim sudah terwakili warna & legenda) */
function shortName(d: DivisionStat): string {
  return d.name.replace(/^(Werkudara|Cakrawala)\s*-\s*/i, "").replace(/\s*\(.*\)\s*$/, "");
}

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

function StatTile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-4 shadow-xs">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl sm:text-3xl font-bold text-[#18181b] dark:text-zinc-100">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">{hint}</p>}
    </div>
  );
}

function Donut({
  parts,
  total,
  active,
  onActive,
}: {
  parts: { key: GroupKey; label: string; value: number; stroke: string }[];
  total: number;
  active: GroupKey | null;
  onActive: (key: GroupKey | null) => void;
}) {
  const shown = parts.filter((p) => p.value > 0);
  // Celah 2px warna permukaan di antara potongan (dalam satuan pathLength=100)
  const gap = shown.length > 1 ? 0.8 : 0;
  let offset = 0;
  const activePart = parts.find((p) => p.key === active);

  return (
    <div className="relative w-40 h-40 sm:w-44 sm:h-44 shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" role="img" aria-label="Sebaran per tim">
        <circle cx="50" cy="50" r="40" fill="none" strokeWidth="14" className="stroke-zinc-100 dark:stroke-zinc-800" />
        {total > 0 &&
          shown.map((p) => {
            const share = (p.value / total) * 100;
            const dash = Math.max(share - gap, 0.1);
            const el = (
              <circle
                key={p.key}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                pathLength={100}
                strokeWidth={active === p.key ? 16 : 14}
                strokeDasharray={`${dash} ${100 - dash}`}
                strokeDashoffset={-offset}
                className={`${p.stroke} transition-[stroke-width,opacity] cursor-pointer ${
                  active && active !== p.key ? "opacity-40" : ""
                }`}
                onMouseEnter={() => onActive(p.key)}
                onMouseLeave={() => onActive(null)}
                onClick={() => onActive(active === p.key ? null : p.key)}
              >
                <title>{`${p.label}: ${p.value} orang (${pct(p.value, total)}%)`}</title>
              </circle>
            );
            offset += share;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="text-2xl font-bold text-[#18181b] dark:text-zinc-100">
          {activePart ? activePart.value : total}
        </span>
        <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 max-w-[80px] leading-tight">
          {activePart ? `${activePart.label} · ${pct(activePart.value, total)}%` : "orang"}
        </span>
      </div>
    </div>
  );
}

function ChoiceCard({ title, divisions, field }: { title: string; divisions: DivisionStat[]; field: keyof DivisionStat }) {
  const [active, setActive] = useState<GroupKey | null>(null);
  const rows = divisions
    .map((d) => ({ d, group: groupOf(d), value: Number(d[field]) || 0 }))
    .sort((a, b) => b.value - a.value || a.d.name.localeCompare(b.d.name));
  const total = rows.reduce((s, r) => s + r.value, 0);
  const max = Math.max(1, ...rows.map((r) => r.value));
  const parts = GROUPS.map((g) => ({
    key: g.key,
    label: g.label,
    stroke: g.stroke,
    value: rows.filter((r) => r.group === g.key).reduce((s, r) => s + r.value, 0),
  }));
  const fillOf = (key: GroupKey) => GROUPS.find((g) => g.key === key)!.fill;

  return (
    <section className="bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-4 min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm sm:text-base font-bold text-[#18181b] dark:text-zinc-100">{title}</h2>
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{total} orang memilih</span>
      </div>

      {total === 0 ? (
        <p className="py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">Belum ada data.</p>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <Donut parts={parts} total={total} active={active} onActive={setActive} />
            {/* Legenda: identitas tidak hanya lewat warna */}
            <ul className="w-full space-y-1.5">
              {parts.map((p) => (
                <li key={p.key}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(p.key)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(p.key)}
                    onBlur={() => setActive(null)}
                    className={`w-full flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-md text-left transition-colors ${
                      active === p.key ? "bg-zinc-100 dark:bg-zinc-800" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold text-[#18181b] dark:text-zinc-100">
                      <span className={`w-2.5 h-2.5 rounded-sm ${fillOf(p.key)}`} />
                      {p.label}
                    </span>
                    <span className="text-xs tabular-nums text-zinc-600 dark:text-zinc-300">
                      {p.value} <span className="text-zinc-400">· {pct(p.value, total)}%</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Rincian per divisi (bar horizontal, nilai tertulis = tampilan tabel) */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 pb-1">
              Per divisi
            </p>
            {rows.map(({ d, group, value }) => {
              const groupLabel = GROUPS.find((g) => g.key === group)!.label;
              const dim = active !== null && active !== group;
              return (
                <div
                  key={d.id}
                  title={`${d.name}: ${value} orang (${pct(value, total)}%)`}
                  className={`grid grid-cols-[minmax(0,9.5rem)_1fr_auto] items-center gap-2.5 py-1 transition-opacity ${
                    dim ? "opacity-35" : ""
                  }`}
                >
                  <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate">
                    <span className="text-zinc-400 dark:text-zinc-500">{group === "nonteknis" ? "" : `${groupLabel} · `}</span>
                    {shortName(d)}
                  </span>
                  <span className="h-2.5 rounded-r bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <span
                      className={`block h-full rounded-r ${fillOf(group)}`}
                      style={{ width: value > 0 ? `max(4px, ${(value / max) * 100}%)` : 0 }}
                    />
                  </span>
                  <span className="text-xs tabular-nums text-right text-zinc-600 dark:text-zinc-300 whitespace-nowrap min-w-[4.5rem]">
                    {value} <span className="text-zinc-400">· {pct(value, total)}%</span>
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

export function StatisticsPage({ stats, error }: StatisticsPageProps) {
  const [scope, setScope] = useState<Scope>("submitted");
  const totals = stats?.totals;
  const divisions = stats?.divisions || [];

  return (
    <div className="flex-1 bg-[#F9F9F8] dark:bg-[#09090b] min-h-screen py-6 px-4 sm:px-8 transition-colors">
      <div className="max-w-6xl mx-auto space-y-5">
        <div>
          <h1 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-[#18181b] dark:text-zinc-100">
            <BarChart3 className="w-5 h-5 text-[#B22234] dark:text-rose-400" />
            Statistik Pendaftar
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Sebaran divisi pilihan 1 dan pilihan 2 calon anggota.
          </p>
        </div>

        {error || !stats || !totals ? (
          <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-xs sm:text-sm text-rose-800 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="font-medium">{error || "Statistik belum tersedia."}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatTile label="Sudah kirim formulir" value={totals.submitted} />
              <StatTile label="Masih draft" value={totals.draft} hint="Mulai mengisi, belum kirim" />
              <StatTile label="Sudah pilih jadwal" value={totals.booked} hint="Jadwal wawancara" />
              <StatTile label="Wawancara selesai" value={totals.interviewed} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Hitung dari:</span>
              <div className="inline-flex p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800" role="group" aria-label="Cakupan data">
                {(
                  [
                    { key: "submitted", label: `Sudah kirim (${totals.submitted})` },
                    { key: "all", label: `Semua, termasuk draft (${totals.submitted + totals.draft})` },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setScope(opt.key)}
                    aria-pressed={scope === opt.key}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      scope === opt.key
                        ? "bg-white dark:bg-zinc-950 text-[#18181b] dark:text-zinc-100 shadow-xs"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChoiceCard
                key={`p1-${scope}`}
                title="Divisi Pilihan 1"
                divisions={divisions}
                field={scope === "submitted" ? "p1_submitted" : "p1_all"}
              />
              <ChoiceCard
                key={`p2-${scope}`}
                title="Divisi Pilihan 2"
                divisions={divisions}
                field={scope === "submitted" ? "p2_submitted" : "p2_all"}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
