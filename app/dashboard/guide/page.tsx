import { GuidePage } from "@/components/pages/GuidePage";
import { createClient } from "@/utils/supabase/server";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAdminAccess } from "@/utils/adminAccess";

export const instant = false;

export const metadata: Metadata = {
  title: "Guide - Robotika Universitas Sebelas Maret",
  description: "Panduan langkah demi langkah fitur dashboard admin dan hak akses tiap role.",
};

export default async function GuideRoute() {
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
    redirect(`/?error=unauthorized_email&email=${encodeURIComponent(user.email)}`);
  }

  let roleName: string | null = null;
  if (access.roleId) {
    const { data } = await supabase.from("admin_roles").select("name").eq("id", access.roleId).maybeSingle();
    roleName = data?.name || null;
  }

  return (
    <GuidePage
      viewer={{
        name: access.fullName || access.email.split("@")[0],
        isSuperadmin: access.isSuperadmin,
        roleName,
        permissions: access.permissions,
      }}
    />
  );
}
