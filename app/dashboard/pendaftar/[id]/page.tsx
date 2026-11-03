import { ApplicantDetailPage } from "@/components/pages/ApplicantDetailPage";
import { createClient } from "@/utils/supabase/server";
import { connection } from "next/server";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { InterviewQuestionItem } from "@/app/actions/interviewQuestions";

export const instant = false;

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Detail Pendaftar - Robotika Universitas Sebelas Maret",
  description: "Rincian formulir pendaftaran calon anggota UKM Robotika UNS.",
};

export default async function ApplicantDetailRoute({ params }: PageProps) {
  await connection();
  const rawParams = await params;
  const rawId = rawParams?.id || "";
  const id = decodeURIComponent(rawId).trim();

  if (!id) {
    notFound();
  }

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

  // Cari data registrasi berdasarkan id (UUID), registration_code, atau nim
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id
    );

  const selectColumns =
    "id, user_id, registration_code, nim, full_name, user_email, status, current_step, fakultas, prodi, angkatan, whatsapp, primary_division_id, primary_division_name, primary_division_category, primary_reason, secondary_division_id, secondary_division_name, secondary_division_category, secondary_reason, cv_file_name, cv_storage_path, twibbon_url, portfolio_url, agreed_requirements, agreed_truth, submitted_at, created_at, updated_at, assessment_status, assessment_notes, accepted_division_id, accepted_division_name, accepted_division_category, interview_answers";

  let query = supabase
    .from("view_registrations")
    .select(selectColumns);

  if (isUuid) {
    query = query.eq("id", id);
  } else {
    query = query.or(`registration_code.eq.${id},nim.eq.${id}`);
  }

  let { data: applicant, error: applicantError } = await query.maybeSingle();

  if (!applicant || applicantError) {
    // Fallback ke registrations jika diperlukan
    let fallbackQuery = supabase
      .from("registrations")
      .select(selectColumns);
    if (isUuid) {
      fallbackQuery = fallbackQuery.eq("id", id);
    } else {
      fallbackQuery = fallbackQuery.or(`registration_code.eq.${id},nim.eq.${id}`);
    }
    const fallbackRes = await fallbackQuery.maybeSingle();
    if (fallbackRes.data) {
      applicant = fallbackRes.data;
      applicantError = null;
    }
  }

  if (applicantError) {
    console.error("Gagal mengambil data pendaftar:", applicantError.message);
  }

  if (!applicant) {
    notFound();
  }

  // Jalankan pengambilan Signed URL, total pendaftar, urutan pendaftar, daftar divisi, dan pertanyaan wawancara secara paralel
  const [signedResult, totalResult, orderResult, divisionsResult, questionsResult] =
    await Promise.all([
      applicant.cv_storage_path
        ? supabase.storage
            .from("cv-uploads")
            .createSignedUrl(applicant.cv_storage_path, 7200)
            .catch(() => ({ data: null }))
        : Promise.resolve({ data: null }),
      supabase.from("view_registrations").select("*", { count: "exact", head: true }),
      supabase
        .from("view_registrations")
        .select("*", { count: "exact", head: true })
        .lte("created_at", applicant.created_at),
      supabase
        .from("divisions")
        .select("id, name, category")
        .order("category", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("interview_questions")
        .select("*")
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

  let freshCvUrl: string | null = null;
  if (signedResult?.data?.signedUrl) {
    freshCvUrl = signedResult.data.signedUrl;
  }

  const orderNumber = orderResult?.count || 1;
  const totalApplicants = totalResult?.count || 1;
  const divisions = divisionsResult?.data || [];
  const interviewQuestions = (questionsResult?.data as InterviewQuestionItem[]) || [];

  return (
    <ApplicantDetailPage
      applicant={{
        ...applicant,
        cv_file_url: freshCvUrl,
        orderNumber,
        totalApplicants,
      }}
      divisions={divisions}
      interviewQuestions={interviewQuestions}
    />
  );
}
