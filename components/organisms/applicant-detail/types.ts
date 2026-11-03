import { InterviewQuestionItem } from "@/app/actions/interviewQuestions";

export interface DivisionItem {
  id: string;
  name: string;
  category: string;
}

export interface ApplicantDetailData {
  id: string;
  user_id?: string | null;
  registration_code: string | null;
  nim: string | null;
  full_name: string | null;
  user_email: string | null;
  status: string | null;
  assessment_status?: string | null;
  assessment_notes?: string | null;
  accepted_division_id?: string | null;
  accepted_division_name?: string | null;
  accepted_division_category?: string | null;
  current_step?: number | null;
  fakultas: string | null;
  prodi: string | null;
  angkatan: string | null;
  whatsapp: string | null;
  primary_division_id?: string | null;
  primary_division_name: string | null;
  primary_division_category?: string | null;
  primary_reason: string | null;
  secondary_division_id?: string | null;
  secondary_division_name: string | null;
  secondary_division_category?: string | null;
  secondary_reason: string | null;
  cv_file_name: string | null;
  cv_file_url?: string | null;
  cv_storage_path?: string | null;
  twibbon_url?: string | null;
  portfolio_url?: string | null;
  agreed_requirements?: boolean | null;
  agreed_truth?: boolean | null;
  submitted_at: string | null;
  created_at: string | null;
  updated_at?: string | null;
  orderNumber?: number;
  totalApplicants?: number;
  interview_answers?: Record<string, string> | null;
}

export interface ApplicantDetailCardProps {
  applicant: ApplicantDetailData;
  divisions?: DivisionItem[];
  interviewQuestions?: InterviewQuestionItem[];
}

export type DecisionStatus = "pending" | "accepted" | "rejected";
export type AttendanceStatus = "belum" | "hadir" | "tidak_hadir";

