import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getAdminAccess } from "@/utils/adminAccess";
import { hasPdfSignature, validateCvMeta } from "@/utils/cvFile";

export const maxDuration = 60;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ganti berkas CV pendaftar (hanya superadmin).
 * Urutan: unggah berkas baru -> simpan path baru di database -> hapus berkas lama dari storage.
 * Bila penyimpanan ke database gagal, berkas baru dihapus lagi agar storage tetap bersih.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const applicantId = decodeURIComponent(id || "").trim();
    if (!UUID_PATTERN.test(applicantId)) {
      return NextResponse.json({ error: "ID pendaftar tidak valid." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !user.email) {
      return NextResponse.json({ error: "Sesi tidak sah atau telah berakhir. Silakan login kembali." }, { status: 401 });
    }

    const access = await getAdminAccess(supabase, user.email);
    if (!access?.isSuperadmin) {
      return NextResponse.json(
        { error: "Akses ditolak: hanya superadmin yang dapat mengganti CV pendaftar." },
        { status: 403 }
      );
    }

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("cv_file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Berkas CV wajib diunggah." }, { status: 400 });
    }

    const metaError = validateCvMeta(file.name, file.size);
    if (metaError) {
      return NextResponse.json({ error: metaError }, { status: 422 });
    }
    const buffer = await file.arrayBuffer();
    if (!hasPdfSignature(buffer)) {
      return NextResponse.json({ error: "Isi berkas bukan PDF asli." }, { status: 422 });
    }

    const { data: applicant } = await supabase
      .from("applicants")
      .select("id, nim, angkatan")
      .eq("id", applicantId)
      .maybeSingle();
    if (!applicant) {
      return NextResponse.json({ error: "Data pendaftar tidak ditemukan." }, { status: 404 });
    }

    // Format path sama dengan unggahan dari website pendaftaran
    const safeNim = (applicant.nim || "NIM").replace(/[^a-zA-Z0-9]/g, "");
    const safeAngkatan = (applicant.angkatan || "2026").replace(/[^0-9]/g, "") || "2026";
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const newPath = `${safeAngkatan}/${safeNim}_${Date.now()}_${cleanFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("cv-uploads")
      .upload(newPath, buffer, { contentType: "application/pdf", upsert: false });
    if (uploadError) {
      return NextResponse.json({ error: `Gagal mengunggah berkas: ${uploadError.message}` }, { status: 500 });
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc("superadmin_set_applicant_cv", {
      p_applicant: applicantId,
      p_path: newPath,
      p_file_name: file.name,
    });
    if (rpcError) {
      await supabase.storage.from("cv-uploads").remove([newPath]);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    // Hapus berkas CV lama (ditimpa)
    const oldPath = ((rpcData as { old_path?: string | null } | null)?.old_path || "").trim();
    let oldRemoved = true;
    if (oldPath && oldPath !== newPath) {
      const cleanOld = oldPath.replace(/^cv-uploads\//, "");
      const { error: removeError } = await supabase.storage
        .from("cv-uploads")
        .remove(Array.from(new Set([oldPath, cleanOld])));
      if (removeError) {
        console.warn("Gagal menghapus CV lama:", removeError.message);
        oldRemoved = false;
      }
    }

    try {
      revalidatePath(`/dashboard/pendaftar/${applicantId}`);
    } catch {
      // Abaikan
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      message: oldRemoved
        ? "CV berhasil diganti dan berkas lama dihapus dari storage."
        : "CV berhasil diganti, tetapi berkas lama gagal dihapus dari storage.",
    });
  } catch (err: unknown) {
    console.error("Gagal mengganti CV pendaftar:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Terjadi kesalahan internal pada server." },
      { status: 500 }
    );
  }
}
