import { EventDetailPage } from "@/components/pages/EventDetailPage";
import { createClient } from "@/utils/supabase/server";
import { connection } from "next/server";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAdminAccess, hasPermission } from "@/utils/adminAccess";
import {
  ATTENDANCE_SELECT,
  mapAttendanceRow,
  isAttended,
  type DivisionEventSummary,
  type EventAttendanceItem,
  type EventTargetScope,
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
  // Sesi sudah divalidasi middleware; klaim JWT cukup diverifikasi lokal (lebih cepat dari getUser)
  const { data: claimsData } = await supabase.auth.getClaims();
  const email = claimsData?.claims?.email;

  if (!email) {
    redirect("/");
  }

  const fetchAttendees = () =>
    supabase
      .from("event_attendances")
      .select(ATTENDANCE_SELECT)
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

  // Sinkron otomatis berjalan bersamaan dengan pemuatan data agar halaman tidak menunggu;
  // bila ada peserta baru, daftar peserta dimuat ulang sekali
  // Sinkron dipanggil tanpa menunggu cek akses: RPC menolak sendiri bila tidak punya hak kelola acara
  const [access, eventResult, firstAttendees, syncResult, divisionsResult] = await Promise.all([
    getAdminAccess(supabase, email),
    supabase
      .from("division_events")
      .select(
        "id, title, description, division_id, extra_division_ids, target_scope, event_date, end_date, location, is_active, created_by, created_at, divisions(name, category)"
      )
      .eq("id", eventId)
      .maybeSingle(),
    fetchAttendees(),
    supabase.rpc("sync_event_attendees", { p_event_id: eventId }),
    supabase.from("divisions").select("id, name"),
  ]);

  if (!access) {
    await supabase.auth.signOut();
    redirect(`/?error=unauthorized_email&email=${encodeURIComponent(email)}`);
  }

  if (!hasPermission(access, "applicants.view")) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(access, "events.manage");
  const attendeesResult = Number(syncResult.data) > 0 ? await fetchAttendees() : firstAttendees;

  const ev = eventResult.data;
  if (!ev) {
    notFound();
  }

  const divRel = ev.divisions as unknown as {
    name?: string;
    category?: string;
  } | null;

  const attendees: EventAttendanceItem[] = (attendeesResult.data || []).map(mapAttendanceRow);

  const summary: DivisionEventSummary = {
    id: ev.id,
    title: ev.title,
    description: ev.description,
    division_id: ev.division_id,
    extra_division_ids: ev.extra_division_ids || [],
    // Acara gabungan: nama divisi utama + divisi tambahan
    division_name: [
      divRel?.name || ev.division_id || "Semua Divisi",
      ...(ev.extra_division_ids || []).map(
        (id: string) => (divisionsResult.data || []).find((d) => d.id === id)?.name || id
      ),
    ].join(" + "),
    division_category: divRel?.category || "-",
    target_scope: (ev.target_scope as EventTargetScope) || "open",
    event_date: ev.event_date,
    end_date: ev.end_date,
    location: ev.location,
    is_active: Boolean(ev.is_active),
    created_by: ev.created_by,
    created_at: ev.created_at,
    total_attendees: attendees.length,
    present_count: attendees.filter((a) => isAttended(a.status)).length,
  };

  return (
    <EventDetailPage
      event={summary}
      initialAttendees={attendees}
      canManage={canManage}
    />
  );
}

