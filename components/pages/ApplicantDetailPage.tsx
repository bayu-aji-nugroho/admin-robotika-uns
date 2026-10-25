"use client";

import React from "react";
import {
  ApplicantDetailCard,
  ApplicantDetailData,
} from "@/components/organisms/ApplicantDetailCard";

interface ApplicantDetailPageProps {
  applicant: ApplicantDetailData;
}

export function ApplicantDetailPage({ applicant }: ApplicantDetailPageProps) {
  return (
    <div className="flex-1 bg-[#F9F9F8] dark:bg-[#09090b] min-h-screen py-6 px-4 sm:px-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Kartu Rincian Pendaftar */}
        <ApplicantDetailCard applicant={applicant} />
      </div>
    </div>
  );
}
