"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Aturan hak akses (announcements.send) & validasi isi ditegakkan oleh RPC di database.

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface NotificationInput {
  title: string;
  body: string;
  linkUrl?: string;
}

const TITLE_MAX = 120;
const BODY_MAX = 2000;
const LINK_MAX = 300;

function validate(input: NotificationInput): string | null {
  const title = (input.title || "").trim();
  const body = (input.body || "").trim();
  const link = (input.linkUrl || "").trim();
  if (title.length < 3 || title.length > TITLE_MAX) return `Judul 3–${TITLE_MAX} karakter.`;
  if (!body || body.length > BODY_MAX) return `Isi pengumuman 1–${BODY_MAX} karakter.`;
  if (link && (!/^https?:\/\/\S+$/i.test(link) || link.length > LINK_MAX)) {
    return "Link harus diawali http:// atau https:// (maks. 300 karakter).";
  }
  return null;
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
      revalidatePath("/dashboard/notifikasi");
    } catch {
      // Abaikan jika dipanggil dari context non-page
    }
    return { success: true, data: data as T };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Terjadi kesalahan." };
  }
}

/** Kirim pengumuman baru ke semua calon anggota (muncul di lonceng website). */
export async function createNotificationAction(input: NotificationInput) {
  const invalid = validate(input);
  if (invalid) return { success: false, error: invalid } as ActionResult<string>;
  return callRpc<string>("create_applicant_notification", {
    p_title: input.title.trim(),
    p_body: input.body.trim(),
    p_link: (input.linkUrl || "").trim() || null,
  });
}

/** Ubah pengumuman yang sudah terkirim (tidak memicu badge "baru" lagi). */
export async function updateNotificationAction(id: string, input: NotificationInput) {
  const invalid = validate(input);
  if (invalid) return { success: false, error: invalid } as ActionResult<null>;
  return callRpc<null>("update_applicant_notification", {
    p_id: id,
    p_title: input.title.trim(),
    p_body: input.body.trim(),
    p_link: (input.linkUrl || "").trim() || null,
  });
}

/** Hapus pengumuman dari lonceng semua calon anggota. */
export async function deleteNotificationAction(id: string) {
  return callRpc<null>("delete_applicant_notification", { p_id: id });
}
