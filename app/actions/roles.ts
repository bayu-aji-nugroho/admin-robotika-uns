"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getAdminAccess } from "@/utils/adminAccess";
import { AdminPermission, isAdminPermission } from "@/utils/permissions";

export interface AdminRoleItem {
  id: string;
  name: string;
  description: string | null;
  permissions: AdminPermission[];
  created_at: string;
  updated_at: string;
}

export interface RoleMemberItem {
  id: string;
  email: string;
  full_name: string | null;
  role_division: string | null;
  role_id: string | null;
  is_superadmin: boolean;
  is_active: boolean;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Hanya superadmin (ketua umum, wakil ketua, developer) yang boleh
 * mengelola role dan anggota role.
 */
async function verifySuperadmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    return {
      authorized: false as const,
      error: "Sesi tidak sah atau telah berakhir. Silakan login kembali.",
      supabase,
      email: null,
    };
  }

  const access = await getAdminAccess(supabase, user.email);
  if (!access || !access.isSuperadmin) {
    return {
      authorized: false as const,
      error:
        "Akses ditolak: Hanya Ketua Umum, Wakil Ketua, dan Developer yang dapat mengelola role.",
      supabase,
      email: user.email,
    };
  }

  return { authorized: true as const, error: null, supabase, email: user.email };
}

function cleanPermissions(input: string[] | undefined): AdminPermission[] | null {
  const list = Array.from(new Set((input || []).map((p) => p.trim())));
  if (list.some((p) => !isAdminPermission(p))) {
    return null;
  }
  return list as AdminPermission[];
}

function revalidateRolePages() {
  try {
    revalidatePath("/dashboard/role");
  } catch {
    // Abaikan jika dipanggil dari context non-page
  }
}

export async function createRoleAction(input: {
  name: string;
  description?: string;
  permissions: string[];
}): Promise<ActionResult<AdminRoleItem>> {
  try {
    const { authorized, error: authError, supabase, email } =
      await verifySuperadmin();
    if (!authorized) {
      return { success: false, error: authError };
    }

    const name = (input.name || "").trim();
    if (name.length < 2 || name.length > 50) {
      return { success: false, error: "Nama role harus 2–50 karakter." };
    }

    const permissions = cleanPermissions(input.permissions);
    if (!permissions) {
      return { success: false, error: "Terdapat hak akses yang tidak dikenal." };
    }

    const { data, error } = await supabase
      .from("admin_roles")
      .insert({
        name,
        description: (input.description || "").trim() || null,
        permissions,
        created_by: email,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: `Role "${name}" sudah ada.` };
      }
      return { success: false, error: error.message };
    }

    revalidateRolePages();
    return { success: true, data: data as AdminRoleItem };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal membuat role.";
    return { success: false, error: msg };
  }
}

export async function updateRoleAction(
  id: string,
  input: { name?: string; description?: string; permissions?: string[] }
): Promise<ActionResult<AdminRoleItem>> {
  try {
    const { authorized, error: authError, supabase } = await verifySuperadmin();
    if (!authorized) {
      return { success: false, error: authError };
    }

    const payload: Record<string, unknown> = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (name.length < 2 || name.length > 50) {
        return { success: false, error: "Nama role harus 2–50 karakter." };
      }
      payload.name = name;
    }

    if (input.description !== undefined) {
      payload.description = input.description.trim() || null;
    }

    if (input.permissions !== undefined) {
      const permissions = cleanPermissions(input.permissions);
      if (!permissions) {
        return { success: false, error: "Terdapat hak akses yang tidak dikenal." };
      }
      payload.permissions = permissions;
    }

    if (Object.keys(payload).length === 0) {
      return { success: false, error: "Tidak ada perubahan yang diberikan." };
    }

    const { data, error } = await supabase
      .from("admin_roles")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "Nama role tersebut sudah dipakai." };
      }
      return { success: false, error: error.message };
    }

    revalidateRolePages();
    return { success: true, data: data as AdminRoleItem };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memperbarui role.";
    return { success: false, error: msg };
  }
}

export async function deleteRoleAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const { authorized, error: authError, supabase } = await verifySuperadmin();
    if (!authorized) {
      return { success: false, error: authError };
    }

    const { count, error: countError } = await supabase
      .from("admin_whitelist")
      .select("id", { count: "exact", head: true })
      .eq("role_id", id)
      .eq("is_superadmin", false);

    if (countError) {
      return { success: false, error: countError.message };
    }

    if ((count || 0) > 0) {
      return {
        success: false,
        error: `Role masih dipakai ${count} orang. Pindahkan atau cabut akses mereka terlebih dahulu.`,
      };
    }

    const { error } = await supabase.from("admin_roles").delete().eq("id", id);
    if (error) {
      return { success: false, error: error.message };
    }

    revalidateRolePages();
    return { success: true, data: { id } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menghapus role.";
    return { success: false, error: msg };
  }
}

/**
 * Memberikan role ke seseorang berdasarkan email Google-nya.
 * Jika email belum ada di whitelist, akun admin baru dibuat.
 * Jika sudah ada, role-nya dipindahkan dan akun diaktifkan kembali.
 */
export async function assignRoleMemberAction(input: {
  roleId: string;
  email: string;
  fullName?: string;
  roleDivision?: string;
}): Promise<ActionResult<RoleMemberItem>> {
  try {
    const { authorized, error: authError, supabase } = await verifySuperadmin();
    if (!authorized) {
      return { success: false, error: authError };
    }

    const email = (input.email || "").trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      return { success: false, error: "Format email tidak valid." };
    }

    const { data: role } = await supabase
      .from("admin_roles")
      .select("id, name")
      .eq("id", input.roleId)
      .maybeSingle();

    if (!role) {
      return { success: false, error: "Role tidak ditemukan." };
    }

    const { data: existing } = await supabase
      .from("admin_whitelist")
      .select("id, is_superadmin")
      .eq("email", email)
      .maybeSingle();

    const fullName = (input.fullName || "").trim();
    const roleDivision = (input.roleDivision || "").trim();
    const memberColumns =
      "id, email, full_name, role_division, role_id, is_superadmin, is_active";

    if (existing) {
      if (existing.is_superadmin) {
        return {
          success: false,
          error: "Akun superadmin sudah memiliki akses penuh dan tidak perlu diberi role.",
        };
      }

      const payload: Record<string, unknown> = {
        role_id: role.id,
        is_active: true,
      };
      if (fullName) payload.full_name = fullName;
      if (roleDivision) payload.role_division = roleDivision;

      const { data, error } = await supabase
        .from("admin_whitelist")
        .update(payload)
        .eq("id", existing.id)
        .select(memberColumns)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      revalidateRolePages();
      return { success: true, data: data as RoleMemberItem };
    }

    const { data, error } = await supabase
      .from("admin_whitelist")
      .insert({
        email,
        full_name: fullName || null,
        role_division: roleDivision || "anggota",
        role_id: role.id,
        role_oprec: role.name,
        is_active: true,
      })
      .select(memberColumns)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidateRolePages();
    return { success: true, data: data as RoleMemberItem };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menambahkan anggota role.";
    return { success: false, error: msg };
  }
}

/**
 * Mencabut akses admin seseorang (menghapus dari whitelist).
 * Orang tersebut tidak bisa login ke dashboard admin lagi.
 */
export async function revokeRoleMemberAction(
  memberId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const { authorized, error: authError, supabase, email } =
      await verifySuperadmin();
    if (!authorized) {
      return { success: false, error: authError };
    }

    const { data: target } = await supabase
      .from("admin_whitelist")
      .select("id, email, is_superadmin")
      .eq("id", memberId)
      .maybeSingle();

    if (!target) {
      return { success: false, error: "Anggota tidak ditemukan." };
    }

    if (target.is_superadmin) {
      return { success: false, error: "Akses superadmin tidak dapat dicabut dari dashboard." };
    }

    if (target.email.toLowerCase() === email?.toLowerCase()) {
      return { success: false, error: "Anda tidak dapat mencabut akses akun sendiri." };
    }

    const { error } = await supabase
      .from("admin_whitelist")
      .delete()
      .eq("id", memberId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidateRolePages();
    return { success: true, data: { id: memberId } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal mencabut akses.";
    return { success: false, error: msg };
  }
}
