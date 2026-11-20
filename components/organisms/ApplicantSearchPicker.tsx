"use client";

import React, { useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export interface PickedApplicant {
  id: string;
  full_name: string | null;
  nim: string | null;
}

interface ApplicantSearchPickerProps {
  onPick: (applicant: PickedApplicant) => void | Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}

/** Cari calon anggota (pendaftaran terkirim) berdasarkan nama atau NIM, lalu pilih satu. */
export function ApplicantSearchPicker({ onPick, placeholder = "Cari nama atau NIM...", disabled }: ApplicantSearchPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedApplicant[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    // Karakter , ( ) merusak filter .or() PostgREST
    const q = value.replace(/[,()%*]/g, " ").trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      const { data } = await createClient()
        .from("applicants")
        .select("id, full_name, nim")
        .eq("status", "submitted")
        .or(`full_name.ilike.%${q}%,nim.ilike.%${q}%`)
        .order("full_name", { ascending: true })
        .limit(8);
      setResults(data || []);
      setLoading(false);
    }, 300);
  };

  const pick = async (a: PickedApplicant) => {
    setQuery("");
    setResults([]);
    await onPick(a);
  };

  return (
    <div className="relative">
      <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={(e) => search(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={placeholder}
        className="w-full pl-9 pr-8 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/70 rounded-lg text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden disabled:opacity-60"
      />
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />}
      {query.trim().length >= 2 && !loading && (
        <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg text-xs sm:text-sm">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-zinc-500">Tidak ditemukan.</li>
          ) : (
            results.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => void pick(a)}
                  className="w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{a.full_name || "-"}</span>
                  <span className="ml-2 font-mono text-zinc-500">{a.nim || "-"}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
