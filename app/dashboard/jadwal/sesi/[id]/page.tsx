import { InterviewSessionPage } from "@/components/pages/InterviewSessionPage";
import { createClient } from "@/utils/supabase/server";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAdminAccess, hasPermission } from "@/utils/adminAccess";
import type { ScheduledInterview, SheetQuestion } from "@/utils/interviewSchedule.types";

export const instant = false;

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Lembar Wawancara - Robotika Universitas Sebelas Maret",
  description: "Lembar wawancara calon anggota UKM Robotika UNS.",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function InterviewSessionRoute({ params }: PageProps) {
  await connection();
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId || "").trim();
  if (!UUID_PATTERN.test(id)) notFound();

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

  const [bookingResult, adminsResult, questionsResult] = await Promise.all([
    supabase
      .from("interview_bookings")
      .select("id, applicant_id, pair_id, interviewer_ids, start_at, location, status, completed_at")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("admin_whitelist").select("id, full_name, email"),
    supabase
      .from("interview_questions")
      .select("id, question, division, order_index")
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const booking = bookingResult.data;
  if (!booking) notFound();

  const nameOf = new Map(
    (adminsResult.data || []).map((a) => [a.id, a.full_name || a.email.split("@")[0]])
  );
  const interviewerIds: string[] = booking.interviewer_ids || [];

  const session: ScheduledInterview = {
    id: booking.id,
    applicantId: booking.applicant_id,
    completedAt: booking.completed_at,
    pairId: booking.pair_id,
    interviewerIds,
    startAt: booking.start_at,
    location: booking.location,
    status: booking.status,
    // Nama calon anggota diambil dari lembar wawancara (RPC) agar tetap tampil untuk pewawancara
    applicantName: "",
    applicantNim: null,
    interviewers: interviewerIds.map((adminId) => nameOf.get(adminId) || "-"),
    includesMe: interviewerIds.includes(access.id),
  };

  const questions: SheetQuestion[] = questionsResult.data || [];

  return (
    <InterviewSessionPage
      session={session}
      questions={questions}
      viewer={{
        adminId: access.id,
        isSuperadmin: access.isSuperadmin,
        canSchedule: hasPermission(access, "interview.schedule"),
        canViewApplicants: hasPermission(access, "applicants.view"),
        canManageSessions: hasPermission(access, "interview.sessions"),
      }}
    />
  );
}
