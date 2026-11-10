import { InterviewSchedulePage } from "@/components/pages/InterviewSchedulePage";
import type {
  InterviewPair,
  ScheduleAdmin,
  ScheduledInterview,
  MemberAvailabilitySlot,
} from "@/utils/interviewSchedule.types";
import { createClient } from "@/utils/supabase/server";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAdminAccess, hasPermission } from "@/utils/adminAccess";

export const instant = false;

export const metadata: Metadata = {
  title: "Jadwal Wawancara - Robotika Universitas Sebelas Maret",
  description: "Atur pasangan pewawancara, kalender bersama, dan pantau jadwal wawancara calon anggota UKM Robotika UNS.",
};

interface AdminRow {
  id: string;
  full_name: string | null;
  email: string;
  is_active: boolean;
  is_superadmin: boolean;
  interview_whatsapp: string | null;
  admin_roles: { permissions: string[] | null } | null;
}

/** Hasil RPC get_schedule_dashboard (satu nilai jsonb, tidak terkena batas max-rows) */
interface ScheduleDashboardData {
  /** Lokasi unik; slot merujuk ke indeksnya */
  locations: string[];
  member_availability: { admin_id: string; slots: [number, number | null][] }[];
  bookings: {
    id: string;
    applicant_id: string;
    completed_at: string | null;
    pair_id: string | null;
    interviewer_ids: string[] | null;
    start_at: string;
    location: string | null;
    status: "pending" | "accepted";
    applicant_name: string | null;
    applicant_nim: string | null;
  }[];
}

export default async function JadwalWawancaraRoute() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect("/");
  }

  const access = await getAdminAccess(supabase, user.email);

  if (!access) {
    await supabase.auth.signOut();
    redirect(`/?error=unauthorized_email&email=${encodeURIComponent(user.email)}`);
  }

  const [adminsResult, pairsResult, dashboardResult] = await Promise.all([
    supabase
      .from("admin_whitelist")
      .select("id, full_name, email, is_active, is_superadmin, interview_whatsapp, admin_roles(permissions)")
      .order("full_name", { ascending: true }),
    supabase
      .from("interview_pairs")
      .select("id, member_a, member_b, status, created_by")
      .order("created_at", { ascending: true }),
    // Kalender pribadi + booking (1 jam lalu s.d. 60 hari ke depan) dalam satu panggilan
    supabase.rpc("get_schedule_dashboard"),
  ]);

  if (dashboardResult.error) {
    console.error("get_schedule_dashboard:", dashboardResult.error.message);
  }
  const dashboard = (dashboardResult.data as ScheduleDashboardData | null) || {
    locations: [],
    member_availability: [],
    bookings: [],
  };

  const memberAvailability: MemberAvailabilitySlot[] = dashboard.member_availability.flatMap((m) =>
    m.slots.map(([epochSec, locIdx]) => ({
      id: `${m.admin_id}|${epochSec}`,
      adminId: m.admin_id,
      startAt: new Date(epochSec * 1000).toISOString(),
      location: locIdx === null ? null : dashboard.locations[locIdx] ?? null,
    }))
  );

  const adminRows = (adminsResult.data as unknown as AdminRow[]) || [];
  const nameOf = new Map(adminRows.map((a) => [a.id, a.full_name || a.email.split("@")[0]]));

  const admins: ScheduleAdmin[] = adminRows.map((a) => ({
    id: a.id,
    name: nameOf.get(a.id) || "-",
    eligible:
      a.is_active &&
      (a.is_superadmin || (a.admin_roles?.permissions || []).includes("interview.schedule")),
    whatsapp: a.interview_whatsapp,
  }));

  const pairs: InterviewPair[] = (pairsResult.data || []).map((p) => ({
    id: p.id,
    memberA: p.member_a,
    memberB: p.member_b,
    status: p.status,
    createdBy: p.created_by,
  }));

  const scheduled: ScheduledInterview[] = dashboard.bookings.map((b) => ({
    id: b.id,
    applicantId: b.applicant_id,
    completedAt: b.completed_at,
    pairId: b.pair_id,
    interviewerIds: b.interviewer_ids || [],
    startAt: b.start_at,
    location: b.location,
    status: b.status,
    applicantName: b.applicant_name || "Calon anggota",
    applicantNim: b.applicant_nim || null,
    interviewers: (b.interviewer_ids || []).map((id) => nameOf.get(id) || "-"),
    includesMe: (b.interviewer_ids || []).includes(access.id),
  }));

  return (
    <InterviewSchedulePage
      viewer={{
        adminId: access.id,
        isSuperadmin: access.isSuperadmin,
        canSchedule: hasPermission(access, "interview.schedule"),
        canViewApplicants: hasPermission(access, "applicants.view"),
        canManageSessions: hasPermission(access, "interview.sessions"),
      }}
      admins={admins}
      pairs={pairs}
      memberAvailability={memberAvailability}
      scheduled={scheduled}
    />
  );
}
