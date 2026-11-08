export type InterviewBookingStatus = "pending" | "accepted";

export interface ScheduleAdmin {
  id: string;
  name: string;
  /** Aktif dan memiliki hak "interview.schedule" (atau superadmin) */
  eligible: boolean;
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

export interface ScheduledInterview {
  id: string;
  pairId: string | null;
  startAt: string;
  location: string | null;
  status: InterviewBookingStatus;
  applicantName: string;
  applicantNim: string | null;
  interviewers: string[];
  includesMe: boolean;
}

export interface ScheduleViewer {
  adminId: string;
  isSuperadmin: boolean;
  canSchedule: boolean;
}
