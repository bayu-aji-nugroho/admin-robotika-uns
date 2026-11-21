import { RolesPage } from "@/components/pages/RolesPage";
import { createClient } from "@/utils/supabase/server";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAdminAccess, hasPermission } from "@/utils/adminAccess";
import type { AdminRoleItem, RoleMemberItem } from "@/app/actions/roles";

export const instant = false;

export const metadata: Metadata = {
  title: "Role & Akses - Robotika Universitas Sebelas Maret",
  description: "Kelola custom role dan hak akses admin UKM Robotika UNS.",
};

export default async function RoleRoute() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect("/");
  }

  const access = await getAdminAccess(supabase, user.email);

  if (!access) {
    await supabase.auth.signOut();
    redirect(
      `/?error=unauthorized_email&email=${encodeURIComponent(user.email)}`
    );
  }

  if (!access.isSuperadmin) {
    if (!hasPermission(access, "roles.assign_limited")) {
      return <RolesPage canManage={false} roles={[]} members={[]} />;
    }
    // Versi terbatas: hanya role yang boleh diberikan & anggotanya
    const { data: assignable } = await supabase
      .from("admin_roles")
      .select("id, name, description, permissions, is_assignable, created_at, updated_at")
      .eq("is_assignable", true)
      .order("name", { ascending: true });
    const roleIds = (assignable || []).map((r) => r.id);
    const { data: limitedMembers } = roleIds.length
      ? await supabase
          .from("admin_whitelist")
          .select("id, email, full_name, role_division, role_id, is_superadmin, is_active")
          .in("role_id", roleIds)
          .eq("is_superadmin", false)
          .order("full_name", { ascending: true })
      : { data: [] };
    return (
      <RolesPage
        canManage={false}
        limited
        currentEmail={user.email.toLowerCase()}
        roles={(assignable as AdminRoleItem[]) || []}
        members={(limitedMembers as RoleMemberItem[]) || []}
      />
    );
  }

  const [rolesResult, membersResult] = await Promise.all([
    supabase
      .from("admin_roles")
      .select("id, name, description, permissions, is_assignable, created_at, updated_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("admin_whitelist")
      .select("id, email, full_name, role_division, role_id, is_superadmin, is_active")
      .order("full_name", { ascending: true }),
  ]);

  return (
    <RolesPage
      canManage
      currentEmail={user.email.toLowerCase()}
      roles={(rolesResult.data as AdminRoleItem[]) || []}
      members={(membersResult.data as RoleMemberItem[]) || []}
    />
  );
}
