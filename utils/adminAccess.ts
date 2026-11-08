import type { SupabaseClient } from "@supabase/supabase-js";
import { ADMIN_PERMISSION_KEYS, AdminPermission } from "@/utils/permissions";

export interface AdminAccess {
  id: string;
  email: string;
  fullName: string | null;
  roleOprec: string | null;
  roleDivision: string | null;
  roleId: string | null;
  isSuperadmin: boolean;
  permissions: AdminPermission[];
}

/**
 * Mengambil data whitelist + hak akses role admin yang sedang login.
 * Mengembalikan null jika email tidak terdaftar atau tidak aktif.
 * Superadmin (ketua umum, wakil ketua, developer) otomatis punya semua akses.
 */
export async function getAdminAccess(
  supabase: SupabaseClient,
  email: string
): Promise<AdminAccess | null> {
  const { data, error } = await supabase
    .from("admin_whitelist")
    .select(
      "id, email, full_name, role_oprec, role_division, role_id, is_superadmin, is_active, admin_roles(permissions)"
    )
    .eq("email", email.toLowerCase().trim())
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const isSuperadmin = Boolean(data.is_superadmin);
  const role = data.admin_roles as unknown as { permissions?: string[] } | null;
  const rolePermissions = (role?.permissions || []) as AdminPermission[];

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    roleOprec: data.role_oprec,
    roleDivision: data.role_division,
    roleId: data.role_id,
    isSuperadmin,
    permissions: isSuperadmin
      ? [...ADMIN_PERMISSION_KEYS]
      : ADMIN_PERMISSION_KEYS.filter((key) => rolePermissions.includes(key)),
  };
}

export function hasPermission(
  access: AdminAccess | null,
  permission: AdminPermission
): boolean {
  if (!access) return false;
  return access.isSuperadmin || access.permissions.includes(permission);
}
