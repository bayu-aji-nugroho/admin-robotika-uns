import { EventsPage } from "@/components/pages/EventsPage";
import { createClient } from "@/utils/supabase/server";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAdminAccess, hasPermission } from "@/utils/adminAccess";
import type {
  DivisionEventSummary,
  DivisionOptionItem,
  EventTargetScope,
} from "@/utils/divisionEvents.types";

export const instant = false;

export const metadata: Metadata = {
  title: "Buat Acara - Robotika Universitas Sebelas Maret",
  description:
    "Kelola acara per divisi, data tiket QR calon anggota, dan pemindaian kehadiran.",
};

export default async function AcaraRoute() {
  await connection();
  const supabase = await createClient();
  // Sesi sudah divalidasi middleware; klaim JWT cukup diverifikasi lokal (lebih cepat dari getUser)
  const { data: claimsData } = await supabase.auth.getClaims();
  const email = claimsData?.claims?.email;

  if (!email) {
    redirect("/");
  }

  const [access, divisionsResult, eventsResult, attendancesResult] = await Promise.all([
    getAdminAccess(supabase, email),
    supabase
      .from("divisions")
      .select("id, name, category")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("division_events")
      .select(
        "id, title, description, division_id, extra_division_ids, target_scope, event_date, end_date, location, is_active, created_by, created_at, divisions(name, category)"
      )
      .order("event_date", { ascending: false }),
    supabase.from("event_attendances").select("event_id, status"),
  ]);

  if (!access) {
    await supabase.auth.signOut();
    redirect(`/?error=unauthorized_email&email=${encodeURIComponent(email)}`);
  }

  if (!hasPermission(access, "applicants.view")) {
    redirect("/dashboard");
  }

  const divisions = (divisionsResult.data as DivisionOptionItem[]) || [];
  const divisionName = new Map(divisions.map((d) => [d.id, d.name]));

  // Hitung total tiket dan jumlah hadir per event
  const statsMap = new Map<string, { total: number; present: number }>();
  for (const row of attendancesResult.data || []) {
    const entry = statsMap.get(row.event_id) || { total: 0, present: 0 };
    entry.total += 1;
    if (row.status === "present" || row.status === "late") entry.present += 1;
    statsMap.set(row.event_id, entry);
  }

  const events: DivisionEventSummary[] = (eventsResult.data || []).map((ev) => {
    const divRel = ev.divisions as unknown as {
      name?: string;
      category?: string;
    } | null;
    const count = statsMap.get(ev.id) || { total: 0, present: 0 };

    return {
      id: ev.id,
      title: ev.title,
      description: ev.description,
      division_id: ev.division_id,
      extra_division_ids: ev.extra_division_ids || [],
      // Acara gabungan: "Werkudara Elektronika + Werkudara Mekanika + ..."
      division_name: [divRel?.name || ev.division_id || "Semua Divisi", ...(ev.extra_division_ids || []).map((id: string) => divisionName.get(id) || id)].join(" + "),
      division_category: divRel?.category || "-",
      target_scope: (ev.target_scope as EventTargetScope) || "accepted",
      event_date: ev.event_date,
      end_date: ev.end_date,
      location: ev.location,
      is_active: Boolean(ev.is_active),
      created_by: ev.created_by,
      created_at: ev.created_at,
      total_attendees: count.total,
      present_count: count.present,
    };
  });

  return (
    <EventsPage
      initialEvents={events}
      divisions={divisions}
      canManage={hasPermission(access, "events.manage")}
    />
  );
}

