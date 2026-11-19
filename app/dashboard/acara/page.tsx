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
  title: "Acara Divisi - Robotika Universitas Sebelas Maret",
  description:
    "Kelola acara per divisi, data tiket QR calon anggota, dan pemindaian kehadiran.",
};

export default async function AcaraRoute() {
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

  if (!hasPermission(access, "applicants.view")) {
    redirect("/dashboard");
  }

  const [divisionsResult, eventsResult, attendancesResult] = await Promise.all([
    supabase
      .from("divisions")
      .select("id, name, category")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("division_events")
      .select(
        "id, title, description, division_id, target_scope, event_date, end_date, location, is_active, created_by, created_at, divisions(name, category)"
      )
      .order("event_date", { ascending: false }),
    supabase.from("event_attendances").select("event_id, status"),
  ]);

  const divisions = (divisionsResult.data as DivisionOptionItem[]) || [];

  // Hitung total tiket dan jumlah hadir per event
  const statsMap = new Map<string, { total: number; present: number }>();
  for (const row of attendancesResult.data || []) {
    const entry = statsMap.get(row.event_id) || { total: 0, present: 0 };
    entry.total += 1;
    if (row.status === "present") entry.present += 1;
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
      division_name: divRel?.name || ev.division_id,
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

