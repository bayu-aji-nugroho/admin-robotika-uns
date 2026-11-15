// Opsi ekspor PDF pendaftar (dipakai pop-up Ekspor PDF & kedua route /api/export/*).

export type ExportDocType = "list" | "interview";
/** Dasar filter divisi: divisi diterima, pilihan 1, atau pilihan 1/2 */
export type DivisionBasis = "accepted" | "primary" | "any";
export type StatusFilter = "all" | "diterima" | "pertimbangan" | "ditolak";
/** done = wawancara selesai, scheduled = sudah pilih jadwal tapi belum selesai, none = belum pilih jadwal */
export type InterviewFilter = "all" | "done" | "scheduled" | "none";

export const LIST_COLUMNS = [
  { key: "nim", label: "NIM" },
  { key: "prodi", label: "Prodi (Angkatan)" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "primary", label: "Pilihan 1" },
  { key: "secondary", label: "Pilihan 2" },
  { key: "accepted", label: "Divisi Diterima" },
  { key: "status", label: "Status" },
  { key: "interview", label: "Jadwal Wawancara" },
  { key: "interviewers", label: "Pewawancara" },
] as const;

export type ListColumnKey = (typeof LIST_COLUMNS)[number]["key"];

/** Kolom bawaan daftar ringkas (sama dengan ekspor lama) */
export const DEFAULT_LIST_COLUMNS: ListColumnKey[] = [
  "nim",
  "prodi",
  "whatsapp",
  "primary",
  "secondary",
  "accepted",
  "status",
  "interview",
];

export interface ExportFilters {
  /** "all" | "unplaced" (hanya untuk basis accepted) | id divisi */
  division: string;
  basis: DivisionBasis;
  status: StatusFilter;
  interview: InterviewFilter;
}

export interface ExportOptions extends ExportFilters {
  columns: ListColumnKey[];
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  division: "all",
  basis: "accepted",
  status: "all",
  interview: "all",
  columns: DEFAULT_LIST_COLUMNS,
};

const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

export function buildExportQuery(opts: ExportOptions, docType: ExportDocType): string {
  const params = new URLSearchParams({
    division: opts.division,
    basis: opts.basis,
    status: opts.status,
    interview: opts.interview,
  });
  if (docType === "list") params.set("columns", opts.columns.join(","));
  return params.toString();
}

export function parseExportOptions(params: URLSearchParams): ExportOptions {
  const basis = pick(params.get("basis"), ["accepted", "primary", "any"] as const, "accepted");
  let division = (params.get("division") || "all").trim() || "all";
  if (division === "unplaced" && basis !== "accepted") division = "all";
  const columnKeys = LIST_COLUMNS.map((c) => c.key) as ListColumnKey[];
  const rawColumns = params.get("columns");
  const columns = rawColumns
    ? columnKeys.filter((k) => rawColumns.split(",").includes(k))
    : DEFAULT_LIST_COLUMNS;
  return {
    division,
    basis,
    status: pick(params.get("status"), ["all", "diterima", "pertimbangan", "ditolak"] as const, "all"),
    interview: pick(params.get("interview"), ["all", "done", "scheduled", "none"] as const, "all"),
    columns,
  };
}

/** Status penilaian ternormalisasi; kosong dianggap pertimbangan */
export function normalizeAssessment(status: string | null | undefined): Exclude<StatusFilter, "all"> {
  const s = (status || "").toLowerCase().trim();
  if (s === "diterima" || s === "accepted") return "diterima";
  if (s === "ditolak" || s === "rejected") return "ditolak";
  return "pertimbangan";
}

export interface FilterableApplicant {
  accepted_division_id: string | null;
  primary_division_id?: string | null;
  secondary_division_id?: string | null;
  assessment_status: string | null;
}

export function matchesExportFilters(
  row: FilterableApplicant,
  booking: { completed_at?: string | null } | undefined,
  f: ExportFilters
): boolean {
  if (f.division !== "all") {
    if (f.division === "unplaced") {
      if (row.accepted_division_id) return false;
    } else if (f.basis === "accepted") {
      if (row.accepted_division_id !== f.division) return false;
    } else if (f.basis === "primary") {
      if (row.primary_division_id !== f.division) return false;
    } else if (row.primary_division_id !== f.division && row.secondary_division_id !== f.division) {
      return false;
    }
  }
  if (f.status !== "all" && normalizeAssessment(row.assessment_status) !== f.status) return false;
  if (f.interview === "done" && !booking?.completed_at) return false;
  if (f.interview === "scheduled" && (!booking || booking.completed_at)) return false;
  if (f.interview === "none" && booking) return false;
  return true;
}

/** Ringkasan filter untuk judul PDF & nama file */
export function describeExportFilters(f: ExportFilters, divisionName: Map<string, string>): string {
  const parts: string[] = [];
  if (f.division === "all") parts.push("Semua Divisi");
  else if (f.division === "unplaced") parts.push("Belum Ditempatkan");
  else {
    const name = divisionName.get(f.division) || f.division;
    parts.push(
      f.basis === "accepted" ? `Diterima di ${name}` : f.basis === "primary" ? `Pilihan 1 ${name}` : `Memilih ${name}`
    );
  }
  if (f.status !== "all") parts.push(f.status[0].toUpperCase() + f.status.slice(1));
  if (f.interview === "done") parts.push("Sudah Diwawancarai");
  if (f.interview === "scheduled") parts.push("Belum Diwawancarai");
  if (f.interview === "none") parts.push("Belum Pilih Jadwal");
  return parts.join(" · ");
}

export function slugifyFileLabel(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "") || "Ekspor";
}
