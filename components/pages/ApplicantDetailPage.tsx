"use client";

import React from "react";
import { DashboardTemplate } from "@/components/templates/DashboardTemplate";
import {
  ApplicantDetailCard,
  ApplicantDetailData,
} from "@/components/organisms/ApplicantDetailCard";
import { ChevronRight, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ApplicantDetailPageProps {
  applicant: ApplicantDetailData;
}

export function ApplicantDetailPage({ applicant }: ApplicantDetailPageProps) {
  return (
    <div className="flex-1 bg-[#F9F9F8] dark:bg-[#09090b] min-h-screen py-6 px-4 sm:px-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* 1. Breadcrumbs & Tombol Kembali */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
            <Link
              href="/dashboard"
              className="hover:text-[#18181b] dark:hover:text-zinc-100 transition-colors"
            >
              Daftar Pendaftar
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600" />
            <span className="text-[#18181b] dark:text-zinc-200 font-semibold truncate max-w-xs">
              {applicant.full_name || "Detail"}
            </span>
          </nav>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-[#B22234] dark:hover:text-rose-400 transition-colors self-start sm:self-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Daftar</span>
          </Link>
        </div>

        {/* 2. Kartu Rincian Pendaftar */}
        <ApplicantDetailCard applicant={applicant} />
      </div>
    </div>
  );
}
