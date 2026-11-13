"use client";

import React, { useEffect, useState } from "react";
import { SidebarHeader } from "@/components/molecules/SidebarHeader";
import { NavSection } from "@/components/molecules/NavSection";
import { NavItem } from "@/components/atoms/NavItem";
import { Sliders, Users, BarChart3, ShieldCheck, CalendarClock, BookOpen, Bell, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useLocalStorageValue } from "@/utils/useLocalStorageValue";

interface UserProfile {
  name: string;
  email: string;
  oprecRole: string;
  divisionRole: string;
  avatarUrl?: string;
  isSuperadmin?: boolean;
  /** Role Viewer: hanya lihat */
  isViewer?: boolean;
}

interface DashboardSidebarProps {
  currentPath?: string;
  className?: string;
  initialProfile?: UserProfile;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function DashboardSidebar({
  currentPath = "/dashboard",
  className = "",
  initialProfile,
  isCollapsed = false,
  onToggleCollapse,
}: DashboardSidebarProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>(
    initialProfile || {
      name: "Pengurus Robotika",
      email: "",
      oprecRole: "admin",
      divisionRole: "pengurus",
    }
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // Lebar kustom sidebar tersimpan di localStorage; selama drag pakai dragWidth
  const [savedWidthRaw, setSavedWidth] = useLocalStorageValue("sidebar_custom_width");
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const savedWidth = parseInt(savedWidthRaw || "", 10);
  const persistedWidth =
    !isNaN(savedWidth) && savedWidth >= 200 && savedWidth <= 450 ? savedWidth : 270;
  const sidebarWidth = dragWidth ?? persistedWidth;

  // Event listener untuk resize dengan kursor mouse
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = e.clientX;
      if (newWidth < 130) {
        if (!isCollapsed && onToggleCollapse) {
          onToggleCollapse();
        }
      } else {
        if (isCollapsed && onToggleCollapse) {
          onToggleCollapse();
        }
        const clampedWidth = Math.min(Math.max(newWidth, 200), 450);
        setDragWidth(clampedWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setSavedWidth(String(sidebarWidth));
      setDragWidth(null);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, isCollapsed, onToggleCollapse, sidebarWidth, setSavedWidth]);

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user && user.email) {
          const { data: whitelistData } = await supabase
            .from("admin_whitelist")
            .select("full_name, role_oprec, role_division, is_superadmin, admin_roles(permissions)")
            .eq("email", user.email.toLowerCase())
            .maybeSingle();

          setProfile({
            name:
              whitelistData?.full_name ||
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email.split("@")[0],
            email: user.email,
            oprecRole: whitelistData?.role_oprec || "-",
            divisionRole: whitelistData?.role_division || "-",
            avatarUrl:
              user.user_metadata?.avatar_url || user.user_metadata?.picture,
            isSuperadmin: Boolean(whitelistData?.is_superadmin),
            isViewer:
              !whitelistData?.is_superadmin &&
              Boolean(
                (whitelistData?.admin_roles as unknown as { permissions?: string[] } | null)?.permissions?.includes(
                  "viewer.readonly"
                )
              ),
          });
        }
      } catch {
        // Biarkan default fallback profile
      }
    }

    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      router.push("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <aside
      style={{
        width: isCollapsed ? "72px" : `${sidebarWidth}px`,
      }}
      className={`h-screen sticky top-0 flex flex-col bg-white dark:bg-zinc-900 border-r border-[#E4E4E7] dark:border-zinc-800 shrink-0 z-30 select-none overflow-x-hidden ${isResizing ? "transition-none" : "transition-[width] duration-200 ease-in-out"
        } ${className}`}
    >
      {/* 1. Header: Card Akun & Action Icons (Avatar, Nama, Roles, Icon Logout, Icon Collapse) */}
      <SidebarHeader
        name={profile.name}
        oprecRole={profile.oprecRole}
        divisionRole={profile.divisionRole}
        avatarUrl={profile.avatarUrl}
        isCollapsed={isCollapsed}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        onToggleCollapse={onToggleCollapse}
      />

      {/* Penanda role Viewer (hanya lihat) */}
      {profile.isViewer && (
        <div
          title="Role Viewer: Anda dapat melihat semua data tetapi tidak dapat mengubah apa pun."
          className={`mx-3 mt-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 ${
            isCollapsed ? "px-1 py-1.5 text-center text-[9px] font-bold" : "px-3 py-2 text-[11px] font-semibold"
          }`}
        >
          {isCollapsed ? (
            <Eye className="w-4 h-4 mx-auto" />
          ) : (
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 shrink-0" /> Mode Viewer · hanya lihat
            </span>
          )}
        </div>
      )}

      {/* 2. Scrollable Menu Sections (Bebas dari horizontal scrollbar) */}
      <div
        className={`flex-1 overflow-y-auto overflow-x-hidden ${isCollapsed ? "px-2 py-3 space-y-4" : "px-4 py-5 space-y-6"
          }`}
      >
        {/* Section # general (Masih dalam development) */}
        <NavSection title="general" emptyText="Masih dalam development" isCollapsed={isCollapsed} />

        {/* Section # oprec */}
        <NavSection title="oprec" isCollapsed={isCollapsed}>
          {/* 1. Pengaturan OPREC */}
          <NavItem
            label="Pengaturan OPREC"
            icon={Sliders}
            href="/dashboard/pengaturan"
            isActive={currentPath === "/dashboard/pengaturan"}
            isCollapsed={isCollapsed}
          />

          {/* 2. Daftar Pendaftar (Tanpa label [n baru]) */}
          <NavItem
            label="Daftar Pendaftar"
            icon={Users}
            href="/dashboard"
            isActive={currentPath === "/dashboard"}
            isCollapsed={isCollapsed}
          />

          {/* 3. Jadwal Wawancara */}
          <NavItem
            label="Jadwal Wawancara"
            icon={CalendarClock}
            href="/dashboard/jadwal"
            isActive={currentPath.startsWith("/dashboard/jadwal")}
            isCollapsed={isCollapsed}
          />

          {/* 4. Notifikasi Calon Anggota (lonceng di website) */}
          <NavItem
            label="Notifikasi"
            icon={Bell}
            href="/dashboard/notifikasi"
            isActive={currentPath === "/dashboard/notifikasi"}
            isCollapsed={isCollapsed}
          />

          {/* 5. Statistik */}
          <NavItem
            label="Statistik"
            icon={BarChart3}
            href="#statistik"
            isActive={false}
            isCollapsed={isCollapsed}
          />
        </NavSection>

        {/* Section # akses (Hanya superadmin: ketua umum, wakil ketua, developer) */}
        {profile.isSuperadmin && (
          <NavSection title="akses" isCollapsed={isCollapsed}>
            <NavItem
              label="Role"
              icon={ShieldCheck}
              href="/dashboard/role"
              isActive={currentPath === "/dashboard/role"}
              isCollapsed={isCollapsed}
            />
          </NavSection>
        )}

        {/* Section # bantuan (semua admin) */}
        <NavSection title="bantuan" isCollapsed={isCollapsed}>
          <NavItem
            label="Guide"
            icon={BookOpen}
            href="/dashboard/guide"
            isActive={currentPath === "/dashboard/guide"}
            isCollapsed={isCollapsed}
          />
        </NavSection>
      </div>

      {/* Resizable Drag Handle pada sisi kanan border (Desktop only) */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
        title="Tarik kursor untuk mengatur lebar sidebar"
        className="hidden md:block absolute top-0 -right-1 w-2 h-full cursor-col-resize hover:bg-[#B22234]/40 active:bg-[#B22234] transition-colors z-40 select-none group"
      >
        <div className="w-0.5 h-8 bg-zinc-300 dark:bg-zinc-600 rounded-full mx-auto my-auto relative top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </aside>
  );
}
