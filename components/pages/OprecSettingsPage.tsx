"use client";

import React from "react";
import { DashboardTemplate } from "@/components/templates/DashboardTemplate";
import { OprecSettingsCard } from "@/components/organisms/OprecSettingsCard";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface OprecSettingsPageProps {
  initialSettings: {
    id: number;
    is_oprec: boolean;
    label: string;
    updated_at?: string;
  };
}

export function OprecSettingsPage({ initialSettings }: OprecSettingsPageProps) {
  return (
    <DashboardTemplate currentPath="/dashboard/pengaturan">
      <div className="flex-1 bg-[#F9F9F8] dark:bg-[#09090b] min-h-screen py-6 px-4 sm:px-8 transition-colors">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Breadcrumbs (Tanpa Heading & Tanpa Deskripsi Fluff) */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-xs font-medium text-[#71717a] dark:text-zinc-400"
          >
            <Link
              href="/dashboard"
              className="hover:text-[#18181b] dark:hover:text-zinc-100 transition-colors"
            >
              Dashboard
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600" />
            <span>OPREC</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600" />
            <span className="text-[#18181b] dark:text-zinc-200 font-semibold">
              Pengaturan
            </span>
          </nav>

          {/* Settings Card */}
          <OprecSettingsCard
            initialIsOprec={initialSettings.is_oprec}
            initialLabel={initialSettings.label}
            updatedAt={initialSettings.updated_at}
          />
        </div>
      </div>
    </DashboardTemplate>
  );
}
