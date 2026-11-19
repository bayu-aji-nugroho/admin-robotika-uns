export type EventTargetScope = "accepted" | "registered_p1" | "registered_all";

export interface DivisionOptionItem {
  id: string;
  name: string;
  category: string;
}

export interface DivisionEventSummary {
  id: string;
  title: string;
  description: string | null;
  division_id: string;
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
  } | null;
}

export const TARGET_SCOPE_LABELS: Record<EventTargetScope, string> = {
  accepted: "Calon Anggota Diterima (ACC)",
  registered_p1: "Pendaftar Pilihan 1",
  registered_all: "Semua Pendaftar (Pilihan 1 & 2)",
};

