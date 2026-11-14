"use client";

import React from "react";
import { AlertTriangle, ArrowRight, Check, Palette, X } from "lucide-react";
import {
  BANNER_COLOR_PRESETS,
  DEFAULT_BANNER_COLOR,
  bannerTextColor,
  isValidBannerColor,
} from "@/utils/bannerColor";

interface OprecBannerColorFieldProps {
  /** "" = warna bawaan */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** Pemilih warna notifikasi "Open Recruitment dibuka" + pratinjau langsung */
export function OprecBannerColorField({ value, onChange, disabled = false }: OprecBannerColorFieldProps) {
  const color = isValidBannerColor(value) ? value.toLowerCase() : DEFAULT_BANNER_COLOR;
  const text = bannerTextColor(color);

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#18181b] dark:text-zinc-200">
        <Palette className="w-4 h-4 text-[#B22234] dark:text-rose-400" />
        Warna Notifikasi di Landing Page
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {BANNER_COLOR_PRESETS.map((preset) => {
          const active = color === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange(preset.value === DEFAULT_BANNER_COLOR ? "" : preset.value)}
              disabled={disabled}
              title={preset.label}
              aria-label={preset.label}
              aria-pressed={active}
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-transform cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                active
                  ? "border-[#18181b] dark:border-white scale-110"
                  : "border-transparent ring-1 ring-black/10 dark:ring-white/25 hover:scale-105"
              }`}
              style={{ backgroundColor: preset.value }}
            >
              {active && <Check className="w-4 h-4" style={{ color: bannerTextColor(preset.value).color }} strokeWidth={3} />}
            </button>
          );
        })}

        <label
          className={`inline-flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-[#E4E4E7] dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-300 ${
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800"
          }`}
        >
          <input
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value.toLowerCase())}
            disabled={disabled}
            className="w-6 h-6 rounded-full border-0 p-0 bg-transparent cursor-pointer disabled:cursor-not-allowed [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
            aria-label="Pilih warna kustom"
          />
          <span className="font-mono uppercase">{color}</span>
        </label>

        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
          >
            <X className="w-3 h-3" /> Pakai warna bawaan
          </button>
        )}
      </div>

      {/* Pratinjau persis seperti di website */}
      <div className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex justify-center">
        <div
          className="flex items-center gap-2 sm:gap-3 max-w-full pl-3.5 pr-1.5 py-1.5 rounded shadow-lg"
          style={{ backgroundColor: color, color: text.color, boxShadow: `0 10px 15px -3px ${color}4d` }}
        >
          <span className="text-xs sm:text-sm font-semibold truncate">Open Recruitment dibuka, silakan daftar!</span>
          <span
            className="inline-flex items-center gap-1 shrink-0 px-2.5 sm:px-3 py-1 rounded-sm text-[11px] sm:text-xs font-bold"
            style={{ backgroundColor: text.color, color }}
          >
            Daftar
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </span>
          <X className="size-3.5 opacity-80 mx-1" aria-hidden="true" />
        </div>
      </div>

      {text.ratio < 3 ? (
        <p className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          Warna ini kurang kontras dengan teks (rasio {text.ratio.toFixed(1)}:1), sehingga tulisan sulit dibaca. Pilih
          warna yang lebih gelap atau lebih terang.
        </p>
      ) : (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Notifikasi ini muncul di bawah navbar website saat pendaftaran dibuka. Warna teks menyesuaikan otomatis
          (putih/hitam) agar tetap terbaca.
        </p>
      )}
    </div>
  );
}
