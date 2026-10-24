import { OprecSettingsPage } from "@/components/pages/OprecSettingsPage";
import { createClient } from "@/utils/supabase/server";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const instant = false;


export const metadata: Metadata = {
  title: "Pengaturan OPREC - Robotika Universitas Sebelas Maret",
  description:
    "Panel Kontrol Pengaturan Status & Label Pengumuman OPREC UKM Robotika UNS.",
};

export default async function PengaturanOprecRoute() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect("/");
  }

  // Lapisan keamanan kedua di server: verifikasi whitelist database
  const { data: adminRecord } = await supabase
    .from("admin_whitelist")
    .select("id, is_active")
    .eq("email", user.email.toLowerCase())
    .eq("is_active", true)
    .maybeSingle();

  if (!adminRecord) {
    await supabase.auth.signOut();
    redirect(
      `/?error=unauthorized_email&email=${encodeURIComponent(user.email)}`
    );
  }

  // Ambil data pengaturan OPREC dari tabel admin_settings
  const { data: settings } = await supabase
    .from("admin_settings")
    .select("id, is_oprec, label, updated_at")
    .eq("id", 1)
    .maybeSingle();

  return (
    <OprecSettingsPage
      initialSettings={
        settings || {
          id: 1,
          is_oprec: false,
          label: "Informasi pendaftaran segera diumumkan",
          updated_at: new Date().toISOString(),
        }
      }
    />
  );
}
