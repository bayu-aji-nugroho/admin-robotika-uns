"use client";

import React, { useState } from "react";

export interface AcademicStatItem {
  name: string;
  fakultas?: string;
  submitted: number;
  all: number;
}

interface AcademicDistributionCardProps {
  title: string;
  sectionLabel: string;
  items: AcademicStatItem[];
  field: "submitted" | "all";
}

interface DonutPart {
  key: string;
  label: string;
  value: number;
  stroke: string;
  fill: string;
}

const SLOTS: { stroke: string; fill: string }[] = [
  {
    stroke: "stroke-[#2a78d6] dark:stroke-[#3987e5]",
    fill: "bg-[#2a78d6] dark:bg-[#3987e5]",
  },
  {
    stroke: "stroke-[#eb6834] dark:stroke-[#d95926]",
    fill: "bg-[#eb6834] dark:bg-[#d95926]",
  },
  {
    stroke: "stroke-[#1baf7a] dark:stroke-[#199e70]",
    fill: "bg-[#1baf7a] dark:bg-[#199e70]",
  },
  {
    stroke: "stroke-[#B22234] dark:stroke-[#f43f5e]",
    fill: "bg-[#B22234] dark:bg-[#f43f5e]",
  },
  {
    stroke: "stroke-[#7c3aed] dark:stroke-[#a78bfa]",
    fill: "bg-[#7c3aed] dark:bg-[#a78bfa]",
  },
];

const OTHER_SLOT = {
  stroke: "stroke-zinc-400 dark:stroke-zinc-500",
  fill: "bg-zinc-400 dark:bg-zinc-500",
};

const pct = (n: number, total: number) =>
  total > 0 ? Math.round((n / total) * 100) : 0;

/** Memendekkan nama fakultas/prodi yang panjang agar rapi di legenda */
function shortAcademicLabel(name: string): string {
  return name
    .replace(/^Fakultas\s+/i, "F. ")
    .replace(/^Sekolah\s+Vokasi$/i, "Sekolah Vokasi");
}

function AcademicDonut({
  parts,
  total,
  active,
  onActive,
  ariaLabel,
}: {
  parts: DonutPart[];
  total: number;
  active: string | null;
  onActive: (key: string | null) => void;
  ariaLabel: string;
}) {
  const shown = parts.filter((p) => p.value > 0);
  const gap = shown.length > 1 ? 0.8 : 0;
  const activePart = parts.find((p) => p.key === active);

  const segments = shown.map((p, idx) => {
    const prevSum = shown
      .slice(0, idx)
      .reduce((sum, item) => sum + (item.value / total) * 100, 0);
    const share = (p.value / total) * 100;
    const dash = Math.max(share - gap, 0.1);
    return {
      ...p,
      dash,
      offset: prevSum,
    };
  });

  return (
    <div className="relative w-40 h-40 sm:w-44 sm:h-44 shrink-0">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full -rotate-90"
        role="img"
        aria-label={ariaLabel}
      >
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          strokeWidth="14"
          className="stroke-zinc-100 dark:stroke-zinc-800"
        />
        {total > 0 &&
          segments.map((p) => (
            <circle
              key={p.key}
              cx="50"
              cy="50"
              r="40"
              fill="none"
              pathLength={100}
              strokeWidth={active === p.key ? 16 : 14}
              strokeDasharray={`${p.dash} ${100 - p.dash}`}
              strokeDashoffset={-p.offset}
              className={`${p.stroke} transition-[stroke-width,opacity] cursor-pointer ${
                active && active !== p.key ? "opacity-40" : ""
              }`}
              onMouseEnter={() => onActive(p.key)}
              onMouseLeave={() => onActive(null)}
              onClick={() => onActive(active === p.key ? null : p.key)}
            >
              <title>{`${p.label}: ${p.value} orang (${pct(p.value, total)}%)`}</title>
            </circle>
          ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
        <span className="text-2xl font-bold text-[#18181b] dark:text-zinc-100">
          {activePart ? `${pct(activePart.value, total)}%` : total}
        </span>
        <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 max-w-[92px] leading-tight line-clamp-2">
          {activePart
            ? `${shortAcademicLabel(activePart.label)} · ${activePart.value}`
            : "orang"}
        </span>
      </div>
    </div>
  );
}

export function AcademicDistributionCard({
  title,
  sectionLabel,
  items,
  field,
}: AcademicDistributionCardProps) {
  const [active, setActive] = useState<string | null>(null);

  const allRows = items
    .map((item) => ({
      name: item.name,
      fakultas: item.fakultas,
      value: Number(item[field]) || 0,
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "id"));

  const total = allRows.reduce((s, r) => s + r.value, 0);
  const max = Math.max(1, ...allRows.map((r) => r.value));

  const topRows = allRows.slice(0, SLOTS.length);
  const remainingRows = allRows.slice(SLOTS.length);
  const remainingValue = remainingRows.reduce((s, r) => s + r.value, 0);

  const parts: DonutPart[] = topRows.map((r, idx) => ({
    key: r.name,
    label: r.name,
    value: r.value,
    stroke: SLOTS[idx].stroke,
    fill: SLOTS[idx].fill,
  }));

  if (remainingRows.length > 0) {
    parts.push({
      key: "__other__",
      label: `Lainnya (${remainingRows.length})`,
      value: remainingValue,
      stroke: OTHER_SLOT.stroke,
      fill: OTHER_SLOT.fill,
    });
  }

  return (
    <section className="bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-4 min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm sm:text-base font-bold text-[#18181b] dark:text-zinc-100">
          {title}
        </h2>
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {allRows.length} terdaftar · {total} orang
        </span>
      </div>

      {total === 0 ? (
        <p className="py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Belum ada data.
        </p>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <AcademicDonut
              parts={parts}
              total={total}
              active={active}
              onActive={setActive}
              ariaLabel={`Diagram donat ${title}`}
            />

            {/* Legenda Top 5 + Lainnya */}
            <ul className="w-full space-y-1.5 min-w-0">
              {parts.map((p) => (
                <li key={p.key}>
                  <button
                    type="button"
                    title={`${p.label}: ${p.value} orang (${pct(p.value, total)}%)`}
                    onMouseEnter={() => setActive(p.key)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(p.key)}
                    onBlur={() => setActive(null)}
                    onClick={() => setActive(active === p.key ? null : p.key)}
                    className={`w-full flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                      active === p.key
                        ? "bg-zinc-100 dark:bg-zinc-800"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold text-[#18181b] dark:text-zinc-100 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-sm shrink-0 ${p.fill}`}
                      />
                      <span className="truncate">
                        {shortAcademicLabel(p.label)}
                      </span>
                    </span>
                    <span className="text-xs tabular-nums text-zinc-600 dark:text-zinc-300 shrink-0">
                      {p.value}{" "}
                      <span className="text-zinc-400">
                        · {pct(p.value, total)}%
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Rincian lengkap seluruh item */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 pb-1">
              {sectionLabel}
            </p>
            {allRows.map((row, idx) => {
              const partKey = idx < SLOTS.length ? row.name : "__other__";
              const barFill =
                idx < SLOTS.length ? SLOTS[idx].fill : OTHER_SLOT.fill;
              const dim = active !== null && active !== partKey;

              return (
                <div
                  key={`${row.name}-${row.fakultas || idx}`}
                  title={`${row.name}: ${row.value} orang (${pct(row.value, total)}%)`}
                  onMouseEnter={() => setActive(partKey)}
                  onMouseLeave={() => setActive(null)}
                  className={`grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-2.5 py-1 transition-opacity ${
                    dim ? "opacity-35" : ""
                  }`}
                >
                  <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate">
                    {row.name}
                  </span>
                  <span className="h-2.5 rounded-r bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <span
                      className={`block h-full rounded-r ${barFill}`}
                      style={{
                        width:
                          row.value > 0
                            ? `max(4px, ${(row.value / max) * 100}%)`
                            : 0,
                      }}
                    />
                  </span>
                  <span className="text-xs tabular-nums text-right text-zinc-600 dark:text-zinc-300 whitespace-nowrap min-w-[4.5rem]">
                    {row.value}{" "}
                    <span className="text-zinc-400">
                      · {pct(row.value, total)}%
                    </span>
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

