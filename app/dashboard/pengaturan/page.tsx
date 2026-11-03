import { OprecSettingsPage } from "@/components/pages/OprecSettingsPage";
import { createClient } from "@/utils/supabase/server";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { InterviewQuestionItem } from "@/app/actions/interviewQuestions";

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
        .select("id, is_oprec, label, updated_at")
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

  // Tentukan apakah user memiliki hak akses CRUD pertanyaan (role admin atau developer)
  const userRole = (adminRecord.role_oprec || "").toLowerCase().trim();
  const canManage = userRole === "admin" || userRole === "developer";

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
      initialQuestions={questions}
      canManage={canManage}
      userRole={adminRecord.role_oprec || "admin"}
      divisions={divisions}
    />
  );
}
