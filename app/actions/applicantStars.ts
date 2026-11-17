"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getAdminAccess } from "@/utils/adminAccess";

export interface StarResult {
  success: boolean;
  starredByName?: string | null;
  error?: string;
}

/** Status bintang seorang calon anggota + apakah admin ini boleh mengubahnya */
export async function getApplicantStarAction(
  applicantId: string
): Promise<{ starred: boolean; starredByName: string | null; canToggle: boolean }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return { starred: false, starredByName: null, canToggle: false };
    const [access, { data: star }] = await Promise.all([
      getAdminAccess(supabase, user.email),
      supabase.from("applicant_stars").select("starred_by").eq("applicant_id", applicantId).maybeSingle(),
    ]);
    let starredByName: string | null = null;
    if (star?.starred_by) {
      const { data: admin } = await supabase
        .from("admin_whitelist")
        .select("full_name, email")
        .eq("id", star.starred_by)
        .maybeSingle();
      starredByName = admin ? admin.full_name || admin.email.split("@")[0] : "Admin";
    }
    return { starred: Boolean(star), starredByName, canToggle: Boolean(access && !access.isViewer) };
  } catch {
    return { starred: false, starredByName: null, canToggle: false };
  }
}

/** Beri / cabut bintang calon anggota potensial (semua admin kecuali Viewer, dicek di RPC). */
export async function setApplicantStarAction(applicantId: string, starred: boolean): Promise<StarResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Sesi tidak sah atau telah berakhir. Silakan login kembali." };
    }

    const { data, error } = await supabase.rpc("set_applicant_star", {
      p_applicant: applicantId,
      p_starred: starred,
    });
    if (error) return { success: false, error: error.message };

    try {
      revalidatePath("/dashboard");
      revalidatePath(`/dashboard/pendaftar/${applicantId}`);
    } catch {
      // Abaikan
    }
    return { success: true, starredByName: (data as { starred_by_name?: string | null } | null)?.starred_by_name ?? null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Terjadi kesalahan." };
  }
}
