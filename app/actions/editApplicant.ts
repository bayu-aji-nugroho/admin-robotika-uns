"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getAdminAccess } from "@/utils/adminAccess";

export interface ApplicantEditInput {
  full_name: string;
  nim: string;
  angkatan: string;
  whatsapp: string;
  fakultas: string;
  prodi: string;
  twibbon_url: string;
  portfolio_url: string;
  primary_division_id: string;
  primary_reason: string;
  /** Kosong = hapus pilihan 2 */
  secondary_division_id: string;
  secondary_reason: string;
}

export interface EditApplicantResult {
  success: boolean;
  error?: string;
}

/**
 * Mengubah data pendaftar (hanya superadmin). Validasi lengkap & pengecualian trigger
 * immutability ditegakkan oleh RPC superadmin_update_applicant di database.
 */
export async function updateApplicantDataAction(
  applicantId: string,
  input: ApplicantEditInput
): Promise<EditApplicantResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !user.email) {
      return { success: false, error: "Sesi tidak sah atau telah berakhir. Silakan login kembali." };
    }

    const access = await getAdminAccess(supabase, user.email);
    if (!access?.isSuperadmin) {
      return { success: false, error: "Akses ditolak: hanya superadmin yang dapat mengubah data pendaftar." };
    }

    const { error } = await supabase.rpc("superadmin_update_applicant", {
      p_applicant: applicantId,
      p_data: input,
    });
    if (error) {
      return { success: false, error: error.message };
    }

    try {
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/pendaftar");
      revalidatePath(`/dashboard/pendaftar/${applicantId}`);
    } catch {
      // Abaikan
    }
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Terjadi kesalahan." };
  }
}
