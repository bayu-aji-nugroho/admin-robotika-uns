import { StatisticsPage } from "@/components/pages/StatisticsPage";
import { createClient } from "@/utils/supabase/server";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAdminAccess, hasPermission } from "@/utils/adminAccess";
import type { ApplicantStatistics } from "@/components/pages/StatisticsPage";

export const instant = false;

export const metadata: Metadata = {
  title: "Statistik Pendaftar - Robotika Universitas Sebelas Maret",
  description: "Ringkasan jumlah pendaftar dan sebaran divisi pilihan 1 & 2 calon anggota.",
};

export default async function StatistikRoute() {
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
    return <StatisticsPage stats={null} error="Role Anda tidak memiliki hak melihat data pendaftar." />;
  }

  const { data, error } = await supabase.rpc("get_applicant_statistics");
  return (
    <StatisticsPage
      stats={(data as ApplicantStatistics | null) || null}
      error={error ? "Statistik gagal dimuat. Muat ulang halaman." : null}
    />
  );
}
