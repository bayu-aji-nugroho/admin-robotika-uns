"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { INTERVIEW_SLOT_MINUTES, SCHEDULE_MAX_HOUR, SCHEDULE_MIN_HOUR } from "@/utils/jakartaTime";
import type { InterviewSheetData } from "@/utils/interviewSchedule.types";

// Seluruh aturan (keanggotaan pasangan, hak akses, jam yang sudah dipesan)
// ditegakkan oleh fungsi RPC SECURITY DEFINER di database. Action di sini
// hanya validasi ringan + meneruskan pesan error dari database.

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function revalidateSchedulePage() {
  try {
    revalidatePath("/dashboard/jadwal");
  } catch {
    // Abaikan jika dipanggil dari context non-page
  }
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
    if (error) {
      return { success: false, error: error.message };
    }

    revalidateSchedulePage();
    return { success: true, data: data as T };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Terjadi kesalahan." };
  }
}

/** Mengundang admin lain menjadi pasangan pewawancara. */
export async function invitePartnerAction(partnerId: string) {
  return callRpc<string>("invite_interview_partner", { p_partner: partnerId });
}

/** Menerima / menolak undangan pasangan. */
export async function respondInviteAction(pairId: string, accept: boolean) {
  return callRpc<null>("respond_interview_invite", { p_pair: pairId, p_accept: accept });
}

/** Membatalkan undangan atau memutus pasangan (anggota atau superadmin). */
export async function leavePairAction(pairId: string) {
  return callRpc<null>("leave_interview_pair", { p_pair: pairId });
}

/** Superadmin: membentuk pasangan langsung tanpa undangan. */
export async function createPairAction(memberA: string, memberB: string) {
  return callRpc<string>("create_interview_pair", { p_member_a: memberA, p_member_b: memberB });
}

/**
 * Menyimpan No. WhatsApp pewawancara (kosong = hapus). Dinormalisasi ke 62xxx oleh database.
 * `adminId` kosong = diri sendiri; superadmin boleh mengisi milik admin lain.
 */
export async function saveWhatsappAction(phone: string, adminId?: string | null) {
  const value = (phone || "").trim();
  if (value.length > 30) {
    return { success: false, error: "Nomor WhatsApp terlalu panjang." } as ActionResult<string | null>;
  }
  return callRpc<string | null>("set_interview_whatsapp", { p_phone: value, p_admin: adminId || null });
}

/**
 * Menyimpan kalender PRIBADI seorang pewawancara untuk satu tanggal.
 * `slots` = menit mulai sesi 30 menit sejak 00.00 WIB (mis. [480, 510] = 08.00 & 08.30),
 * boleh tidak berurutan. `adminId` kosong = diri sendiri; superadmin boleh mengisi milik admin lain.
 * Jadwal pasangan dihitung otomatis dari irisan kalender kedua anggotanya.
 */
export async function saveMyDayAction(input: {
  adminId?: string | null;
  date: string;
  slots: number[];
  location?: string;
}): Promise<ActionResult<{ added: number; removed: number; kept_booked: number }>> {
  const date = (input.date || "").trim();
  const slots = Array.from(new Set(input.slots || [])).map(Number);
  const location = (input.location || "").trim();

  if (!DATE_PATTERN.test(date)) {
    return { success: false, error: "Tanggal tidak valid." };
  }
  if (
    slots.some(
      (m) =>
        !Number.isInteger(m) ||
        m < SCHEDULE_MIN_HOUR * 60 ||
        m + INTERVIEW_SLOT_MINUTES > SCHEDULE_MAX_HOUR * 60 ||
        m % INTERVIEW_SLOT_MINUTES !== 0
    )
  ) {
    return { success: false, error: "Slot wawancara hanya antara 07.00 sampai 21.00 (per 30 menit)." };
  }
  if (location.length > 300) {
    return { success: false, error: "Lokasi/link maksimal 300 karakter." };
  }

  return callRpc("set_admin_availability", {
    p_date: date,
    p_slots: slots,
    p_location: location || null,
    p_admin: input.adminId || null,
  });
}

/**
 * Mencatat lokasi/link wawancara sebuah sesi (setelah disepakati dengan calon anggota).
 * `applySameDay` = terapkan juga ke semua sesi pasangan yang sama di tanggal yang sama.
 * Kosong = hapus lokasi.
 */
export async function setBookingLocationAction(
  bookingId: string,
  location: string,
  applySameDay = false
): Promise<ActionResult<number>> {
  const value = (location || "").trim();
  if (value.length > 300) {
    return { success: false, error: "Lokasi/link maksimal 300 karakter." };
  }
  return callRpc<number>("set_booking_location", {
    p_booking: bookingId,
    p_location: value,
    p_apply_same_day: applySameDay,
  });
}

/** Tandai / batalkan sesi wawancara selesai (pewawancara sesi itu atau superadmin). */
export async function setInterviewCompletedAction(bookingId: string, done: boolean) {
  return callRpc<string | null>("set_interview_completed", { p_booking: bookingId, p_done: done });
}

/** Ambil lembar wawancara satu calon anggota: identitas, divisi pilihan, dan catatan tersimpan. */
export async function getInterviewSheetAction(applicantId: string): Promise<ActionResult<InterviewSheetData>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_interview_sheet", { p_applicant: applicantId });
    if (error) return { success: false, error: error.message };
    return { success: true, data: data as InterviewSheetData };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Terjadi kesalahan." };
  }
}

/**
 * Ambil soal terpilih (5 per bagian) seorang calon anggota. Bila belum pernah diacak,
 * `candidate` (hasil acak di browser) disimpan & dikunci. null = belum diacak (role hanya-lihat).
 * Tidak memakai callRpc agar halaman tidak di-revalidate saat lembar dibuka.
 */
export async function ensureQuestionPicksAction(
  applicantId: string,
  candidate: string[]
): Promise<ActionResult<string[] | null>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("ensure_interview_question_picks", {
      p_applicant: applicantId,
      p_candidate: candidate.slice(0, 60),
    });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as string[] | null) || null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Terjadi kesalahan." };
  }
}

/** Simpan catatan jawaban wawancara (hanya interview_answers; status penilaian tidak berubah). */
export async function saveInterviewAnswersAction(
  applicantId: string,
  answers: Record<string, string>
): Promise<ActionResult<null>> {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(answers || {})) {
    if (typeof value === "string" && value.trim()) clean[key] = value;
  }
  return callRpc<null>("save_interview_answers", { p_applicant: applicantId, p_answers: clean });
}
