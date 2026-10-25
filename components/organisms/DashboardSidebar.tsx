"use client";

import React, { useEffect, useState } from "react";
import { SidebarHeader } from "@/components/molecules/SidebarHeader";
import { NavSection } from "@/components/molecules/NavSection";
import { NavItem } from "@/components/atoms/NavItem";
import { Sliders, Users, BarChart3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { ThemeToggle } from "@/components/atoms/ThemeToggle";

interface UserProfile {
  name: string;
  email: string;
  oprecRole: string;
  divisionRole: string;
  avatarUrl?: string;
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
  const [sidebarWidth, setSidebarWidth] = useState<number>(270);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // Muat lebar kustom sidebar dari localStorage jika ada
  useEffect(() => {
    try {
      const savedWidth = localStorage.getItem("sidebar_custom_width");
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed) && parsed >= 200 && parsed <= 450) {
          setSidebarWidth(parsed);
        }
      }
    } catch (_) { }
  }, []);

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
        setSidebarWidth(clampedWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try {
        localStorage.setItem("sidebar_custom_width", String(sidebarWidth));
      } catch (_) { }
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
  }, [isResizing, isCollapsed, onToggleCollapse, sidebarWidth]);

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
            .select("full_name, role_oprec, role_division")
            .eq("email", user.email.toLowerCase())
            .maybeSingle();

          setProfile({
            name:
              whitelistData?.full_name ||
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email.split("@")[0],
            email: user.email,
            oprecRole: whitelistData?.role_oprec || "developer",
            divisionRole: whitelistData?.role_division || "pemrograman",
            avatarUrl:
              user.user_metadata?.avatar_url || user.user_metadata?.picture,
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

          {/* 3. Statistik */}
          <NavItem
            label="Statistik"
            icon={BarChart3}
            href="#statistik"
            isActive={false}
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
