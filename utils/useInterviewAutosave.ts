"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { patchInterviewAnswersAction } from "@/app/actions/interviewSchedule";

export type AutosaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

/** Jeda setelah berhenti mengetik sebelum disimpan otomatis */
const AUTOSAVE_DELAY_MS = 1500;
/** Coba lagi otomatis bila gagal (mis. koneksi putus) */
const RETRY_DELAY_MS = 5000;

function diffAnswers(current: Record<string, string>, base: Record<string, string>) {
  const changes: Record<string, string> = {};
  for (const key of new Set([...Object.keys(current), ...Object.keys(base)])) {
    const now = (current[key] || "").trim() ? current[key] : "";
    const before = (base[key] || "").trim() ? base[key] : "";
    if (now !== before) changes[key] = now;
  }
  return changes;
}

/**
 * Simpan otomatis catatan wawancara: hanya kunci yang berubah yang dikirim.
 * `baseline` = catatan terakhir dari server (set ulang via `resetBaseline` saat data dimuat).
 * `flush()` menyimpan seketika (untuk tombol Simpan / Tandai Selesai).
 */
export function useInterviewAutosave(
  applicantId: string,
  answers: Record<string, string>,
  enabled: boolean,
  initialBaseline: Record<string, string> = {}
) {
  const baselineRef = useRef<Record<string, string>>({ ...initialBaseline });
  const answersRef = useRef(answers);
  const inFlightRef = useRef<Promise<boolean> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const resetBaseline = useCallback((loaded: Record<string, string>) => {
    baselineRef.current = { ...loaded };
  }, []);

  const flush = useCallback(async (): Promise<boolean> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Tunggu penyimpanan yang sedang berjalan agar urutan tetap benar
    if (inFlightRef.current) await inFlightRef.current;

    const changes = diffAnswers(answersRef.current, baselineRef.current);
    if (Object.keys(changes).length === 0) return true;

    setStatus("saving");
    const run = patchInterviewAnswersAction(applicantId, changes).then((res) => {
      if (!res.success) {
        setStatus("error");
        setError(res.error || "Gagal menyimpan catatan.");
        return false;
      }
      const next = { ...baselineRef.current };
      for (const [key, value] of Object.entries(changes)) {
        if (value) next[key] = value;
        else delete next[key];
      }
      baselineRef.current = next;
      setError(null);
      setSavedAt(new Date());
      // Masih ada ketikan baru selama menyimpan -> tetap "pending"
      setStatus(Object.keys(diffAnswers(answersRef.current, next)).length ? "pending" : "saved");
      return true;
    });
    inFlightRef.current = run;
    const ok = await run.catch(() => {
      setStatus("error");
      setError("Koneksi terputus. Mencoba menyimpan lagi...");
      return false;
    });
    inFlightRef.current = null;
    return ok;
  }, [applicantId]);

  // Jadwalkan simpan otomatis setiap ada perubahan
  useEffect(() => {
    if (!enabled) return;
    const dirty = Object.keys(diffAnswers(answers, baselineRef.current)).length > 0;
    if (!dirty) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      timerRef.current = null;
      const ok = await flush();
      if (!ok) {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          void flush();
        }, RETRY_DELAY_MS);
      }
    }, AUTOSAVE_DELAY_MS);
    const markPending = setTimeout(() => setStatus((s) => (s === "saving" ? s : "pending")), 0);
    return () => clearTimeout(markPending);
  }, [answers, enabled, flush]);

  // Simpan saat tab disembunyikan, peringatkan bila menutup halaman sebelum tersimpan
  useEffect(() => {
    if (!enabled) return;
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(diffAnswers(answersRef.current, baselineRef.current)).length > 0 || inFlightRef.current) {
        void flush();
        e.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [enabled, flush]);

  // Bersihkan timer saat unmount
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return { status, savedAt, error, flush, resetBaseline };
}
