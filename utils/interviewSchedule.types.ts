export type InterviewBookingStatus = "pending" | "accepted";

export interface ScheduleAdmin {
  id: string;
  name: string;
  /** Aktif dan memiliki hak "interview.schedule" (atau superadmin) */
  eligible: boolean;
  /** No. WhatsApp untuk konfirmasi wawancara, format 62xxx */
  whatsapp: string | null;
}

export interface InterviewPair {
  id: string;
  memberA: string;
  memberB: string;
  status: "pending" | "active";
  /** admin yang mengirim undangan / membentuk pasangan */
  createdBy: string | null;
}

export interface PairAvailabilitySlot {
  id: string;
  pairId: string;
  startAt: string;
  location: string | null;
  updatedByName: string | null;
  booking: { applicantName: string; status: InterviewBookingStatus } | null;
}

/** Satu slot 30 menit di kalender pribadi seorang pewawancara */
export interface MemberAvailabilitySlot {
  id: string;
  adminId: string;
  startAt: string;
  location: string | null;
}

export interface ScheduledInterview {
  id: string;
  applicantId: string;
  /** Waktu sesi ditandai selesai oleh pewawancara (null = belum) */
  completedAt: string | null;
  pairId: string | null;
  interviewerIds: string[];
  startAt: string;
  location: string | null;
  status: InterviewBookingStatus;
  applicantName: string;
  applicantNim: string | null;
  interviewers: string[];
  includesMe: boolean;
}

/** Pertanyaan dari bank pertanyaan wawancara (subset kolom) */
export interface SheetQuestion {
  id: string;
  question: string;
  division: string;
  order_index: number;
}

/** Data lembar wawancara satu calon anggota (RPC get_interview_sheet) */
export interface InterviewSheetData {
  applicant: {
    id: string;
    full_name: string | null;
    nim: string | null;
    prodi: string | null;
    angkatan: string | null;
    primary_division_id: string | null;
    primary_division_name: string | null;
    secondary_division_id: string | null;
    secondary_division_name: string | null;
  };
  answers: Record<string, string>;
  can_edit: boolean;
}

export interface ScheduleViewer {
  adminId: string;
  isSuperadmin: boolean;
  canSchedule: boolean;
  /** Punya hak applicants.view (boleh membuka lembar wawancara sesi mana pun) */
  canViewApplicants: boolean;
  /** Punya hak interview.sessions (atau superadmin): boleh mengubah semua sesi wawancara */
  canManageSessions: boolean;
}
