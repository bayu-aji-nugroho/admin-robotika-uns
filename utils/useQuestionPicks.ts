"use client";

import { useEffect, useState } from "react";
import { ensureQuestionPicksAction } from "@/app/actions/interviewSchedule";
import { buildQuestionPicks, type GroupableQuestion } from "@/utils/interviewQuestionGroups";

type Groups = { general: GroupableQuestion[]; primary: GroupableQuestion[]; secondary: GroupableQuestion[] };

/**
 * Soal terpilih (5 per bagian) untuk lembar wawancara seorang calon anggota.
 * Pertama kali dibuka: diacak di browser lalu dikunci di database; selanjutnya selalu sama.
 * `ready` false selama belum dimuat. `picks` null = tampilkan semua soal (belum diacak).
 */
export function useQuestionPicks(
  applicantId: string,
  groups: Groups | null,
  answers: Record<string, string> | null
) {
  const [state, setState] = useState<{ key: string; picks: string[] | null } | null>(null);
  // Hanya dijalankan sekali per calon anggota, setelah soal & jawaban tersedia
  const enabled = Boolean(groups && answers);

  useEffect(() => {
    if (!enabled || !groups || !answers) return;
    let active = true;
    const candidate = buildQuestionPicks(groups, answers);
    ensureQuestionPicksAction(applicantId, candidate).then((res) => {
      if (!active) return;
      setState({ key: applicantId, picks: res.success ? res.data ?? null : null });
    });
    return () => {
      active = false;
    };
    // groups/answers sengaja tidak jadi dependensi: acak hanya sekali per calon anggota
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicantId, enabled]);

  const current = state?.key === applicantId ? state : null;
  return { ready: current !== null, picks: current?.picks ?? null };
}
