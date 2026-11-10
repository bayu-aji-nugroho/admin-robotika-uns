import { NotificationsPage } from "@/components/pages/NotificationsPage";
import { createClient } from "@/utils/supabase/server";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAdminAccess, hasPermission } from "@/utils/adminAccess";
import type { SentNotification } from "@/components/organisms/NotificationManager";

export const instant = false;

export const metadata: Metadata = {
  title: "Notifikasi Calon Anggota - Robotika Universitas Sebelas Maret",
  description: "Kirim pengumuman yang muncul di lonceng notifikasi website calon anggota.",
};

export default async function NotifikasiRoute() {
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

  const [notificationsResult, adminsResult] = await Promise.all([
    supabase
      .from("applicant_notifications")
      .select("id, title, body, link_url, created_by, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("admin_whitelist").select("id, full_name, email"),
  ]);

  const nameOf = new Map(
    (adminsResult.data || []).map((a) => [a.id, a.full_name || a.email.split("@")[0]])
  );

  const notifications: SentNotification[] = (notificationsResult.data || []).map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    linkUrl: n.link_url,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
    createdByName: n.created_by ? nameOf.get(n.created_by) || null : null,
  }));

  return (
    <NotificationsPage
      notifications={notifications}
      canSend={hasPermission(access, "announcements.send")}
    />
  );
}
