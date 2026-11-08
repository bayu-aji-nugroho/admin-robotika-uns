import { RolesPage } from "@/components/pages/RolesPage";
import { createClient } from "@/utils/supabase/server";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAdminAccess } from "@/utils/adminAccess";
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
    return <RolesPage canManage={false} roles={[]} members={[]} />;
  }

  const [rolesResult, membersResult] = await Promise.all([
    supabase
      .from("admin_roles")
      .select("id, name, description, permissions, created_at, updated_at")
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
