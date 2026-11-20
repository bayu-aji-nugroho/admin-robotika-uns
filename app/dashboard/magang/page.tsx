import { InternshipSchedulePage } from "@/components/pages/InternshipSchedulePage";
import { createClient } from "@/utils/supabase/server";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAdminAccess, hasPermission } from "@/utils/adminAccess";

export const instant = false;

export const metadata: Metadata = {
  title: "Jadwal Magang - Robotika Universitas Sebelas Maret",
  description: "Kelola jadwal magang (tanggal, jam, tempat) per divisi.",
};

export default async function MagangRoute() {
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

  const [divisionsResult, schedulesResult, adminResult, excusesResult] = await Promise.all([
    supabase
      .from("divisions")
      .select("id, name, category")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("internship_schedules")
      .select("id, division_id, scheduled_at, location")
      .order("scheduled_at", { ascending: true }),
    // Divisi bawaan form sesuai role panitia OPREC admin ini
    supabase
      .from("admin_whitelist")
      .select("internship_division")
      .eq("email", user.email.toLowerCase().trim())
      .maybeSingle(),
    supabase.from("internship_excuses").select("schedule_id, applicant_id, applicants(full_name, nim)"),
  ]);
  const initialExcuses = (excusesResult.data || []).map((e) => {
    const app = e.applicants as unknown as { full_name: string | null; nim: string | null } | null;
    return { schedule_id: e.schedule_id, applicant_id: e.applicant_id, full_name: app?.full_name ?? null, nim: app?.nim ?? null };
  });

  return (
    <InternshipSchedulePage
      divisions={divisionsResult.data || []}
      initialSchedules={schedulesResult.data || []}
      canManage={hasPermission(access, "events.manage")}
      defaultDivision={adminResult.data?.internship_division ?? null}
      initialExcuses={initialExcuses}
    />
  );
}
