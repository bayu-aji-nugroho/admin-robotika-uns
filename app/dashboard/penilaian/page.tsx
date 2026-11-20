import { GradebookPage } from "@/components/pages/GradebookPage";
import { createClient } from "@/utils/supabase/server";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAdminAccess, hasPermission } from "@/utils/adminAccess";

export const instant = false;

export const metadata: Metadata = {
  title: "Penilaian Calon Anggota - Robotika Universitas Sebelas Maret",
  description: "Kehadiran pertemuan dan nilai calon anggota per divisi Pilihan 1.",
};

export default async function PenilaianRoute() {
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

  const [divisionsResult, adminResult] = await Promise.all([
    supabase
      .from("divisions")
      .select("id, name, category")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true }),
    // Divisi bawaan sesuai role panitia OPREC admin ini (sama dengan Jadwal Magang)
    supabase
      .from("admin_whitelist")
      .select("internship_division")
      .eq("email", user.email.toLowerCase().trim())
      .maybeSingle(),
  ]);

  return (
    <GradebookPage
      divisions={divisionsResult.data || []}
      defaultDivision={adminResult.data?.internship_division ?? null}
      canAssess={hasPermission(access, "applicants.assess")}
      canMarkAttendance={hasPermission(access, "events.manage")}
    />
  );
}
