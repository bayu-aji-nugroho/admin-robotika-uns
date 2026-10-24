"use client";

import React, { useEffect, useState } from "react";
import { SidebarHeader } from "@/components/molecules/SidebarHeader";
import { NavSection } from "@/components/molecules/NavSection";
import { NavItem } from "@/components/atoms/NavItem";
import {
  Sliders,
  Users,
  BarChart3,
  LogOut,
  Loader2,
} from "lucide-react";
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
}

export function DashboardSidebar({
  currentPath = "/dashboard",
  className = "",
  initialProfile,
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
  const [applicantCount, setApplicantCount] = useState<number>(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

          // Ambil jumlah pendaftar terkini
          const { count } = await supabase
            .from("registrations")
            .select("*", { count: "exact", head: true });

          if (count !== null && count !== undefined) {
            setApplicantCount(count);
          }
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
      className={`w-64 sm:w-72 h-screen sticky top-0 flex flex-col bg-white dark:bg-zinc-900 border-r border-[#E4E4E7] dark:border-zinc-800 shrink-0 z-30 select-none ${className}`}
    >
      {/* 1. Header: Icon Gambar Akun, Nama, & Dua Role (OPREC & Divisi) */}
      <SidebarHeader
        name={profile.name}
        oprecRole={profile.oprecRole}
        divisionRole={profile.divisionRole}
        avatarUrl={profile.avatarUrl}
      />

      {/* 2. Scrollable Menu Sections */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {/* Section # general [kosong] */}
        <NavSection title="general" emptyText="Daftar menu kosong" />

        {/* Section # oprec (Hanya 3: Pengaturan OPREC, Daftar Pendaftar, Statistik) */}
        <NavSection title="oprec">
          {/* 1. Pengaturan OPREC */}
          <NavItem
            label="Pengaturan OPREC"
            icon={Sliders}
            href="/dashboard/pengaturan"
            isActive={currentPath === "/dashboard/pengaturan"}
          />

          {/* 2. Daftar Pendaftar */}
          <NavItem
            label="Daftar Pendaftar"
            icon={Users}
            href="/dashboard"
            isActive={currentPath === "/dashboard"}
            badge={applicantCount > 0 ? `${applicantCount} Baru` : undefined}
            badgeVariant="subtle"
          />

          {/* 3. Statistik */}
          <NavItem
            label="Statistik"
            icon={BarChart3}
            href="#statistik"
            isActive={false}
          />
        </NavSection>
      </div>

      {/* 3. Bottom Footer (Tema & Tombol Keluar) */}
      <div className="p-3 border-t border-[#E4E4E7] dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
        <div className="flex items-center justify-between px-2 py-0.5 text-xs text-[#71717a] dark:text-zinc-400">
          <span>Tema</span>
          <ThemeToggle />
        </div>

        {/* Tombol Keluar / Kembali ke Halaman Masuk */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#52525b] dark:text-zinc-400 hover:text-[#B22234] dark:hover:text-rose-400 hover:bg-[#FCF2F3] dark:hover:bg-rose-950/20 rounded-lg transition-colors group cursor-pointer disabled:opacity-60"
        >
          <div className="flex items-center gap-2">
            {isLoggingOut ? (
              <Loader2 className="w-4 h-4 text-[#B22234] dark:text-rose-400 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4 text-[#71717a] dark:text-zinc-400 group-hover:text-[#B22234] dark:group-hover:text-rose-400 transition-colors" />
            )}
            <span>{isLoggingOut ? "Keluar..." : "Keluar ke Halaman Masuk"}</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 group-hover:text-[#B22234] dark:group-hover:text-rose-400">
            ESC
          </span>
        </button>
      </div>
    </aside>
  );
}
