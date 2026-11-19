export type EventTargetScope = "open" | "accepted" | "registered_p1" | "registered_all";

export interface DivisionOptionItem {
  id: string;
  name: string;
  category: string;
}

export interface DivisionEventSummary {
  id: string;
  title: string;
  description: string | null;
  /** null = Semua Divisi */
  division_id: string | null;
  division_name: string;
  division_category: string;
  target_scope: EventTargetScope;
  event_date: string;
  end_date: string | null;
  location: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  total_attendees: number;
  present_count: number;
}

export interface EventAttendanceItem {
  id: string;
  event_id: string;
  applicant_id: string;
  qr_token: string;
  status: "pending" | "present" | "excused";
  checked_in_at: string | null;
  checked_in_by: string | null;
  created_at: string;
  applicant: {
    id: string;
    full_name: string | null;
    nim: string | null;
    prodi: string | null;
    fakultas: string | null;
    /** Pilihan divisi, mis. "Humas / Media Branding" */
    divisions: string | null;
  } | null;
}

/** Kolom tabel kehadiran + data calon anggota (dipakai server & client agar sama) */
export const ATTENDANCE_SELECT =
  "id, event_id, applicant_id, qr_token, status, checked_in_at, checked_in_by, created_at, applicants(id, full_name, nim, prodi, fakultas, applicant_divisions(priority, divisions(name)))";

type AttendanceRow = {
  id: string;
  event_id: string;
  applicant_id: string;
  qr_token: string;
  status: string;
  checked_in_at: string | null;
  checked_in_by: string | null;
  created_at: string;
  applicants: unknown;
};

export function mapAttendanceRow(row: AttendanceRow): EventAttendanceItem {
  const app = row.applicants as
    | (Omit<NonNullable<EventAttendanceItem["applicant"]>, "divisions"> & {
        applicant_divisions?: { priority: number; divisions: { name: string } | null }[] | null;
      })
    | null;
  const divisions = (app?.applicant_divisions || [])
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .map((d) => d.divisions?.name)
    .filter(Boolean)
    .join(" / ");
  return {
    id: row.id,
    event_id: row.event_id,
    applicant_id: row.applicant_id,
    qr_token: row.qr_token,
    status: row.status as EventAttendanceItem["status"],
    checked_in_at: row.checked_in_at,
    checked_in_by: row.checked_in_by,
    created_at: row.created_at,
    applicant: app
      ? { id: app.id, full_name: app.full_name, nim: app.nim, prodi: app.prodi, fakultas: app.fakultas, divisions: divisions || null }
      : null,
  };
}

export const TARGET_SCOPE_LABELS: Record<EventTargetScope, string> = {
  open: "Semua Calon Anggota (tercatat saat scan)",
  accepted: "Calon Anggota Diterima (ACC)",
  registered_p1: "Pendaftar Pilihan 1",
  registered_all: "Semua Pendaftar (Pilihan 1 & 2)",
};

