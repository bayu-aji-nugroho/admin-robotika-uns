import { DashboardPage } from "@/components/pages/DashboardPage";
import { createClient } from "@/utils/supabase/server";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const instant = false;


export const metadata: Metadata = {
  title: "Dashboard Admin - Robotika Universitas Sebelas Maret",
  description: "Panel Kontrol Sistem UKM Robotika UNS untuk Pengelolaan OPREC dan Data Organisasi.",
};

export default async function DashboardRoute() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect("/");
  }

  // Jalankan verifikasi whitelist dan pengambilan data pendaftar secara paralel
  const [adminRecordResult, registrationsResult] = await Promise.all([
    supabase
      .from("admin_whitelist")
      .select("id, is_active")
      .eq("email", user.email.toLowerCase())
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("registrations")
      .select(
        "id, full_name, nim, primary_division_name, status, current_step, registration_code, created_at, submitted_at"
      )
      .order("created_at", { ascending: true }),
  ]);

  const adminRecord = adminRecordResult.data;
  const registrations = registrationsResult.data;

  if (!adminRecord) {
    await supabase.auth.signOut();
    redirect(`/?error=unauthorized_email&email=${encodeURIComponent(user.email)}`);
  }

  return <DashboardPage initialRegistrations={registrations || []} />;
}
