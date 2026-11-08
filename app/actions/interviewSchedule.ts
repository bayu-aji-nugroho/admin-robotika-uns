"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { SCHEDULE_MAX_HOUR, SCHEDULE_MIN_HOUR } from "@/utils/jakartaTime";

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
 * Menyimpan kalender bersama sebuah pasangan untuk satu tanggal.
 * `hours` = jam mulai sesi (boleh tidak berurutan, mis. [8, 9, 15, 16]).
 */
export async function savePairDayAction(input: {
  pairId: string;
  date: string;
  hours: number[];
  location?: string;
}): Promise<ActionResult<{ added: number; removed: number; kept_booked: number }>> {
  const date = (input.date || "").trim();
  const hours = Array.from(new Set(input.hours || [])).map(Number);
  const location = (input.location || "").trim();

  if (!DATE_PATTERN.test(date)) {
    return { success: false, error: "Tanggal tidak valid." };
  }
  if (hours.some((h) => !Number.isInteger(h) || h < SCHEDULE_MIN_HOUR || h >= SCHEDULE_MAX_HOUR)) {
    return { success: false, error: "Jam wawancara hanya antara 07.00 sampai 21.00." };
  }
  if (location.length > 300) {
    return { success: false, error: "Lokasi/link maksimal 300 karakter." };
  }

  return callRpc("set_pair_availability", {
    p_pair: input.pairId,
    p_date: date,
    p_hours: hours,
    p_location: location || null,
  });
}
