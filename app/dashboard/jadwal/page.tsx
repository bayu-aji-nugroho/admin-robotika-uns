import { InterviewSchedulePage } from "@/components/pages/InterviewSchedulePage";
import type {
  InterviewPair,
  PairAvailabilitySlot,
  ScheduleAdmin,
  ScheduledInterview,
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
  admin_roles: { permissions: string[] | null } | null;
}

interface BookingRow {
  id: string;
  pair_id: string | null;
  interviewer_ids: string[];
  start_at: string;
  location: string | null;
  status: "pending" | "accepted";
  applicants: { full_name: string | null; nim: string | null } | null;
}

// Tampilkan jadwal mulai 1 jam lalu agar sesi yang sedang berlangsung tetap terlihat
function oneHourAgoIso() {
  return new Date(Date.now() - 60 * 60 * 1000).toISOString();
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

  const since = oneHourAgoIso();

  const [adminsResult, pairsResult, availabilityResult, bookingsResult] = await Promise.all([
    supabase
      .from("admin_whitelist")
      .select("id, full_name, email, is_active, is_superadmin, admin_roles(permissions)")
      .order("full_name", { ascending: true }),
    supabase
      .from("interview_pairs")
      .select("id, member_a, member_b, status, created_by")
      .order("created_at", { ascending: true }),
    supabase
      .from("interview_availability")
      .select("id, pair_id, start_at, location, updated_by")
      .gte("start_at", since)
      .order("start_at", { ascending: true }),
    supabase
      .from("interview_bookings")
      .select("id, pair_id, interviewer_ids, start_at, location, status, applicants(full_name, nim)")
      .gte("start_at", since)
      .order("start_at", { ascending: true }),
  ]);

  const adminRows = (adminsResult.data as unknown as AdminRow[]) || [];
  const nameOf = new Map(adminRows.map((a) => [a.id, a.full_name || a.email.split("@")[0]]));

  const admins: ScheduleAdmin[] = adminRows.map((a) => ({
    id: a.id,
    name: nameOf.get(a.id) || "-",
    eligible:
      a.is_active &&
      (a.is_superadmin || (a.admin_roles?.permissions || []).includes("interview.schedule")),
  }));

  const pairs: InterviewPair[] = (pairsResult.data || []).map((p) => ({
    id: p.id,
    memberA: p.member_a,
    memberB: p.member_b,
    status: p.status,
    createdBy: p.created_by,
  }));

  const bookingRows = (bookingsResult.data as unknown as BookingRow[]) || [];
  const scheduled: ScheduledInterview[] = bookingRows.map((b) => ({
    id: b.id,
    pairId: b.pair_id,
    startAt: b.start_at,
    location: b.location,
    status: b.status,
    applicantName: b.applicants?.full_name || "Calon anggota",
    applicantNim: b.applicants?.nim || null,
    interviewers: (b.interviewer_ids || []).map((id) => nameOf.get(id) || "-"),
    includesMe: (b.interviewer_ids || []).includes(access.id),
  }));

  const availability: PairAvailabilitySlot[] = (availabilityResult.data || []).map((slot) => {
    const booking = scheduled.find(
      (s) =>
        s.pairId === slot.pair_id &&
        new Date(s.startAt).getTime() === new Date(slot.start_at).getTime()
    );
    return {
      id: slot.id,
      pairId: slot.pair_id,
      startAt: slot.start_at,
      location: slot.location,
      updatedByName: slot.updated_by ? nameOf.get(slot.updated_by) || null : null,
      booking: booking ? { applicantName: booking.applicantName, status: booking.status } : null,
    };
  });

  return (
    <InterviewSchedulePage
      viewer={{
        adminId: access.id,
        isSuperadmin: access.isSuperadmin,
        canSchedule: hasPermission(access, "interview.schedule"),
      }}
      admins={admins}
      pairs={pairs}
      availability={availability}
      scheduled={scheduled}
    />
  );
}
