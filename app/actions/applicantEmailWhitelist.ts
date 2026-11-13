"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Hak akses (oprec.settings) & validasi email ditegakkan oleh RPC di database.

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function callRpc<T>(fn: string, args: Record<string, unknown>): Promise<ActionResult<T>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Sesi tidak sah atau telah berakhir. Silakan login kembali." };
    }
    const { data, error } = await supabase.rpc(fn, args);
    if (error) return { success: false, error: error.message };
    try {
      revalidatePath("/dashboard/pengaturan");
    } catch {
      // Abaikan jika dipanggil dari context non-page
    }
    return { success: true, data: data as T };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Terjadi kesalahan." };
  }
}

/** Izinkan email non-SSO (akun SSO calon anggota bermasalah) untuk login & mendaftar. */
export async function addApplicantEmailAction(email: string, note: string) {
  const value = (email || "").trim().toLowerCase();
  if (!value || value.length > 254) {
    return { success: false, error: "Email wajib diisi." } as ActionResult<string>;
  }
  return callRpc<string>("add_applicant_email_whitelist", { p_email: value, p_note: (note || "").trim() || null });
}

/** Cabut pengecualian email non-SSO. */
export async function removeApplicantEmailAction(email: string) {
  return callRpc<null>("remove_applicant_email_whitelist", { p_email: email });
}
