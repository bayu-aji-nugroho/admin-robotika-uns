import { ApplicantDetailPage } from "@/components/pages/ApplicantDetailPage";
import { createClient } from "@/utils/supabase/server";
import { connection } from "next/server";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";

export const instant = false;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  await params;
  return {
    title: "Detail Pendaftar - Robotika Universitas Sebelas Maret",
    description: "Rincian formulir pendaftaran calon anggota UKM Robotika UNS.",
  };
}

export default async function ApplicantDetailRoute({ params }: PageProps) {
  await connection();
  const { id } = await params;

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

  let query = supabase
    .from("registrations")
    .select(
      "id, registration_code, nim, full_name, user_email, status, fakultas, prodi, angkatan, whatsapp, primary_division_name, primary_reason, secondary_division_name, secondary_reason, cv_file_name, cv_file_url, cv_storage_path, submitted_at, created_at"
    );

  if (isUuid) {
    query = query.eq("id", id);
  } else {
    query = query.or(`registration_code.eq.${id},nim.eq.${id}`);
  }

  const { data: applicant } = await query.maybeSingle();

  if (!applicant) {
    notFound();
  }

  // Hasilkan signed URL terkini jika berkas tersimpan di storage
  let freshCvUrl = applicant.cv_file_url;
  if (applicant.cv_storage_path) {
    try {
      const { data: signed } = await supabase.storage
        .from("cv-uploads")
        .createSignedUrl(applicant.cv_storage_path, 7200);

      if (signed?.signedUrl) {
        freshCvUrl = signed.signedUrl;
      }
    } catch {
      // Pertahankan url bawaan jika gagal generate
    }
  }

  // Hitung total seluruh pendaftar
  const { count: totalCount } = await supabase
    .from("registrations")
    .select("*", { count: "exact", head: true });

  // Hitung urutan pendaftar (pendaftar ke berapa berdasarkan created_at)
  const { count: orderCount } = await supabase
    .from("registrations")
    .select("*", { count: "exact", head: true })
    .lte("created_at", applicant.created_at);

  const orderNumber = orderCount || 1;
  const totalApplicants = totalCount || 1;

  return (
    <ApplicantDetailPage
      applicant={{
        ...applicant,
        cv_file_url: freshCvUrl,
        orderNumber,
        totalApplicants,
      }}
    />
  );
}
