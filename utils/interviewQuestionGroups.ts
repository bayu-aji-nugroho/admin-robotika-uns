// Pengelompokan pertanyaan wawancara untuk seorang pendaftar:
// General, Divisi Pilihan 1, dan Divisi Pilihan 2.
// Dipakai bersama oleh halaman detail pendaftar dan ekspor lembar wawancara (PDF)
// agar isi keduanya selalu sama.

export interface GroupableQuestion {
  id: string;
  question: string;
  division: string;
  order_index?: number;
}

export interface QuestionGroupTarget {
  primary_division_id?: string | null;
  primary_division_name?: string | null;
  secondary_division_id?: string | null;
  secondary_division_name?: string | null;
}

/** Kunci khusus di interview_answers untuk catatan umum pewawancara */
export const INTERVIEW_NOTES_KEY = "_notes";

// Pertanyaan per divisi bisa memakai ID spesifik ("werkudara-elektronika")
// maupun ID umum lama tanpa tim ("elektronika") yang berlaku untuk kedua tim.
function isQuestionMatchingDivision(
  questionDivision: string,
  targetDivId?: string | null,
  targetDivName?: string | null
) {
  if (!targetDivId && !targetDivName) return false;
  const qDiv = questionDivision.toLowerCase().trim();
  const divId = (targetDivId || "").toLowerCase().trim();
  const divName = (targetDivName || "").toLowerCase().trim();

  return qDiv === divId || qDiv === divName || divId.includes(qDiv) || divName.includes(qDiv);
}

export function groupInterviewQuestions<T extends GroupableQuestion>(
  questions: T[],
  target: QuestionGroupTarget
) {
  const isGeneral = (q: T) => (q.division || "").toLowerCase() === "general";

  const general = questions.filter(isGeneral);

  const primary = questions.filter(
    (q) =>
      !isGeneral(q) &&
      isQuestionMatchingDivision(q.division, target.primary_division_id, target.primary_division_name)
  );

  // Pilihan 2 hanya berisi pertanyaan yang belum muncul di Pilihan 1
  const secondary = questions.filter(
    (q) =>
      !isGeneral(q) &&
      !primary.some((pq) => pq.id === q.id) &&
      isQuestionMatchingDivision(q.division, target.secondary_division_id, target.secondary_division_name)
  );

  return { general, primary, secondary };
}
