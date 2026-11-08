"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getAdminAccess, hasPermission } from "@/utils/adminAccess";

export interface InterviewQuestionItem {
  id: string;
  question: string;
  division: string;
  order_index: number;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Memverifikasi apakah pengguna saat ini terautentikasi dan role-nya memiliki
 * hak akses "interview.manage" (atau superadmin).
 */
async function verifyAdminOrDeveloperRole() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    return {
      authorized: false,
      error: "Sesi tidak sah atau telah berakhir. Silakan login kembali.",
      user: null,
      supabase,
    };
  }

  const access = await getAdminAccess(supabase, user.email);

  if (!access) {
    return {
      authorized: false,
      error: "Akses ditolak: Akun Anda tidak terdaftar sebagai admin aktif.",
      user,
      supabase,
    };
  }

  if (!hasPermission(access, "interview.manage")) {
    return {
      authorized: false,
      error:
        "Akses ditolak: Role Anda tidak memiliki hak mengelola pertanyaan wawancara.",
      user,
      supabase,
    };
  }

  return {
    authorized: true,
    error: null,
    user,
    supabase,
  };
}

/**
 * Mengambil seluruh daftar pertanyaan interview (aktif maupun non-aktif)
 * untuk ditampilkan di panel pengaturan.
 */
export async function getInterviewQuestionsAction(): Promise<
  ActionResult<InterviewQuestionItem[]>
> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return { success: false, error: "Pengguna belum login." };
    }

    const { data, error } = await supabase
      .from("interview_questions")
      .select("*")
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data as InterviewQuestionItem[]) || [] };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Gagal mengambil daftar pertanyaan.";
    return { success: false, error: msg };
  }
}

/**
 * Menambahkan pertanyaan interview baru (General atau Divisi).
 */
export async function addInterviewQuestionAction(input: {
  question: string;
  division: string;
  order_index?: number;
}): Promise<ActionResult<InterviewQuestionItem>> {
  try {
    const { authorized, error: authError, user, supabase } =
      await verifyAdminOrDeveloperRole();

    if (!authorized || !supabase) {
      return { success: false, error: authError || "Tidak memiliki otoritas." };
    }

    const cleanedQuestion = (input.question || "").trim();
    const cleanedDivision = (input.division || "general").trim().toLowerCase();

    if (!cleanedQuestion) {
      return { success: false, error: "Teks pertanyaan tidak boleh kosong." };
    }

    if (cleanedQuestion.length < 5) {
      return {
        success: false,
        error: "Teks pertanyaan terlalu pendek (minimal 5 karakter).",
      };
    }

    const { data, error } = await supabase
      .from("interview_questions")
      .insert({
        question: cleanedQuestion,
        division: cleanedDivision,
        order_index: input.order_index ?? 0,
        is_active: true,
        created_by: user?.email || null,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    try {
      revalidatePath("/dashboard/pengaturan");
      revalidatePath("/dashboard/pendaftar");
    } catch {
      // Abaikan jika dipanggil dari context non-page
    }

    return { success: true, data: data as InterviewQuestionItem };
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : "Terjadi kesalahan saat menambahkan pertanyaan.";
    return { success: false, error: msg };
  }
}

/**
 * Memperbarui pertanyaan interview yang sudah ada.
 */
export async function updateInterviewQuestionAction(
  id: string,
  input: {
    question?: string;
    division?: string;
    is_active?: boolean;
    order_index?: number;
  }
): Promise<ActionResult<InterviewQuestionItem>> {
  try {
    const { authorized, error: authError, supabase } =
      await verifyAdminOrDeveloperRole();

    if (!authorized || !supabase) {
      return { success: false, error: authError || "Tidak memiliki otoritas." };
    }

    const targetId = (id || "").trim();
    if (!targetId) {
      return { success: false, error: "ID pertanyaan tidak valid." };
    }

    const updatePayload: Record<string, unknown> = {};

    if (input.question !== undefined) {
      const trimmedQ = input.question.trim();
      if (!trimmedQ || trimmedQ.length < 5) {
        return {
          success: false,
          error: "Teks pertanyaan minimal 5 karakter dan tidak boleh kosong.",
        };
      }
      updatePayload.question = trimmedQ;
    }

    if (input.division !== undefined) {
      updatePayload.division = input.division.trim().toLowerCase();
    }

    if (input.is_active !== undefined) {
      updatePayload.is_active = Boolean(input.is_active);
    }

    if (input.order_index !== undefined) {
      updatePayload.order_index = Number(input.order_index) || 0;
    }

    if (Object.keys(updatePayload).length === 0) {
      return { success: false, error: "Tidak ada data perubahan yang diberikan." };
    }

    const { data, error } = await supabase
      .from("interview_questions")
      .update(updatePayload)
      .eq("id", targetId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    try {
      revalidatePath("/dashboard/pengaturan");
      revalidatePath("/dashboard/pendaftar");
    } catch {
      // Abaikan jika dipanggil dari context non-page
    }

    return { success: true, data: data as InterviewQuestionItem };
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : "Terjadi kesalahan saat memperbarui pertanyaan.";
    return { success: false, error: msg };
  }
}

/**
 * Menghapus pertanyaan interview secara permanen.
 */
export async function deleteInterviewQuestionAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const { authorized, error: authError, supabase } =
      await verifyAdminOrDeveloperRole();

    if (!authorized || !supabase) {
      return { success: false, error: authError || "Tidak memiliki otoritas." };
    }

    const targetId = (id || "").trim();
    if (!targetId) {
      return { success: false, error: "ID pertanyaan tidak valid." };
    }

    const { error } = await supabase
      .from("interview_questions")
      .delete()
      .eq("id", targetId);

    if (error) {
      return { success: false, error: error.message };
    }

    try {
      revalidatePath("/dashboard/pengaturan");
      revalidatePath("/dashboard/pendaftar");
    } catch {
      // Abaikan jika dipanggil dari context non-page
    }

    return { success: true, data: { id: targetId } };
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : "Terjadi kesalahan saat menghapus pertanyaan.";
    return { success: false, error: msg };
  }
}

