import { OprecSettingsPage } from "@/components/pages/OprecSettingsPage";
import { createClient } from "@/utils/supabase/server";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { InterviewQuestionItem } from "@/app/actions/interviewQuestions";
import { getAdminAccess, hasPermission } from "@/utils/adminAccess";

export const instant = false;

export const metadata: Metadata = {
  title: "Pengaturan OPREC - Robotika Universitas Sebelas Maret",
  description:
    "Panel Kontrol Pengaturan Status, Label Pengumuman, dan Bank Pertanyaan Wawancara OPREC UKM Robotika UNS.",
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

  // Jalankan verifikasi whitelist, pengambilan pengaturan, bank pertanyaan, dan divisi secara paralel
  const [adminRecordResult, settingsResult, questionsResult, divisionsResult] =
    await Promise.all([
      supabase
        .from("admin_whitelist")
        .select("id, is_active, role_oprec, role_division")
        .eq("email", user.email.toLowerCase())
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("admin_settings")
        .select("id, is_oprec, label, announcement_at, updated_at")
        .eq("id", 1)
        .maybeSingle(),
      supabase
        .from("interview_questions")
        .select("*")
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("divisions")
        .select("id, name, category")
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true }),
    ]);

  const adminRecord = adminRecordResult.data;
  const settings = settingsResult.data;
  const questions = (questionsResult.data as InterviewQuestionItem[]) || [];
  const divisions = divisionsResult.data || [];

  if (!adminRecord) {
    await supabase.auth.signOut();
    redirect(
      `/?error=unauthorized_email&email=${encodeURIComponent(user.email)}`
    );
  }

  // Hak akses diambil dari role admin (custom role) atau status superadmin
  const access = await getAdminAccess(supabase, user.email);
  const canManage = hasPermission(access, "interview.manage");
  const canEditSettings = hasPermission(access, "oprec.settings");

  return (
    <OprecSettingsPage
      initialSettings={
        settings || {
          id: 1,
          is_oprec: false,
          label: "Informasi pendaftaran segera diumumkan",
          announcement_at: null,
          updated_at: new Date().toISOString(),
        }
      }
      initialQuestions={questions}
      canManage={canManage}
      canEditSettings={canEditSettings}
      userRole={adminRecord.role_oprec || "admin"}
      divisions={divisions}
    />
  );
}
