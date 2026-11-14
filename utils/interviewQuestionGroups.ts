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

/** Jumlah soal yang ditampilkan per bagian (General, Pilihan 1, Pilihan 2) */
export const QUESTIONS_PER_GROUP = 5;

/**
 * Mengacak soal terpilih: 5 per bagian. Soal yang sudah punya jawaban selalu ikut terpilih
 * agar catatan lama tidak tersembunyi; sisanya diisi acak sampai 5.
 */
export function buildQuestionPicks(
  groups: { general: GroupableQuestion[]; primary: GroupableQuestion[]; secondary: GroupableQuestion[] },
  answers: Record<string, string>
): string[] {
  const picks: string[] = [];
  for (const items of [groups.general, groups.primary, groups.secondary]) {
    const answered = items.filter((q) => (answers[q.id] || "").trim());
    const rest = items.filter((q) => !(answers[q.id] || "").trim());
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    const chosen = [...answered, ...rest.slice(0, Math.max(0, QUESTIONS_PER_GROUP - answered.length))];
    picks.push(...chosen.map((q) => q.id));
  }
  return picks;
}

/**
 * Memisahkan soal satu bagian menjadi yang ditampilkan (terpilih) dan yang disembunyikan
 * di dropdown "Pertanyaan lain". Tanpa data terpilih (belum diacak), semua ditampilkan.
 */
export function splitByPicks<T extends GroupableQuestion>(items: T[], picks: string[] | null) {
  if (!picks) return { shown: items, hidden: [] as T[] };
  const picked = new Set(picks);
  const shown = items.filter((q) => picked.has(q.id));
  // Bagian tanpa satu pun soal terpilih (mis. divisi berubah setelah diacak): tampilkan semua
  if (shown.length === 0) return { shown: items, hidden: [] as T[] };
  return { shown, hidden: items.filter((q) => !picked.has(q.id)) };
}
