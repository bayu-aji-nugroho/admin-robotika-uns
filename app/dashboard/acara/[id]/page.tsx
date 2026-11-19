import { EventDetailPage } from "@/components/pages/EventDetailPage";
import { createClient } from "@/utils/supabase/server";
import { connection } from "next/server";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAdminAccess, hasPermission } from "@/utils/adminAccess";
import type {
  DivisionEventSummary,
  EventAttendanceItem,
  EventTargetScope,
} from "@/utils/divisionEvents.types";

export const instant = false;

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Detail Acara & Scanner QR - Robotika Universitas Sebelas Maret",
  description:
    "Data tiket QR calon anggota divisi dan scanner kehadiran kamera.",
};

export default async function EventDetailRoute({ params }: PageProps) {
  await connection();
  const { id } = await params;
  const eventId = decodeURIComponent(id || "").trim();
  if (!eventId) notFound();

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

  if (!hasPermission(access, "applicants.view")) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(access, "events.manage");
  // Sinkron otomatis: calon anggota yang baru diterima/mendaftar langsung dapat tiket
  if (canManage) {
    await supabase.rpc("sync_event_attendees", { p_event_id: eventId });
  }

  const [eventResult, attendeesResult] = await Promise.all([
    supabase
      .from("division_events")
      .select(
        "id, title, description, division_id, target_scope, event_date, end_date, location, is_active, created_by, created_at, divisions(name, category)"
      )
      .eq("id", eventId)
      .maybeSingle(),
    supabase
      .from("event_attendances")
      .select(
        "id, event_id, applicant_id, qr_token, status, checked_in_at, checked_in_by, created_at, applicants(id, full_name, nim, prodi, fakultas)"
      )
      .eq("event_id", eventId)
      .order("created_at", { ascending: true }),
  ]);

  const ev = eventResult.data;
  if (!ev) {
    notFound();
  }

  const divRel = ev.divisions as unknown as {
    name?: string;
    category?: string;
  } | null;

  const attendees: EventAttendanceItem[] = (attendeesResult.data || []).map(
    (row) => {
      const appRel = row.applicants as unknown as
        | EventAttendanceItem["applicant"]
        | null;
      return {
        id: row.id,
        event_id: row.event_id,
        applicant_id: row.applicant_id,
        qr_token: row.qr_token,
        status: row.status as EventAttendanceItem["status"],
        checked_in_at: row.checked_in_at,
        checked_in_by: row.checked_in_by,
        created_at: row.created_at,
        applicant: appRel,
      };
    }
  );

  const summary: DivisionEventSummary = {
    id: ev.id,
    title: ev.title,
    description: ev.description,
    division_id: ev.division_id,
    division_name: divRel?.name || ev.division_id,
    division_category: divRel?.category || "-",
    target_scope: (ev.target_scope as EventTargetScope) || "accepted",
    event_date: ev.event_date,
    end_date: ev.end_date,
    location: ev.location,
    is_active: Boolean(ev.is_active),
    created_by: ev.created_by,
    created_at: ev.created_at,
    total_attendees: attendees.length,
    present_count: attendees.filter((a) => a.status === "present").length,
  };

  return (
    <EventDetailPage
      event={summary}
      initialAttendees={attendees}
      canManage={canManage}
    />
  );
}

