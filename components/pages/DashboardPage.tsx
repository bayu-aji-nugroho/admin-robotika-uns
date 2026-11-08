"use client";

import React from "react";
import {
  ApplicantList,
  RegistrationItem,
} from "@/components/organisms/ApplicantList";

interface DashboardPageProps {
  initialRegistrations?: RegistrationItem[];
  divisions?: { id: string; name: string }[];
}

export function DashboardPage({
  initialRegistrations = [],
  divisions = [],
}: DashboardPageProps) {
  return (
    <div className="flex-1 bg-[#F9F9F8] dark:bg-[#09090b] min-h-screen py-6 px-4 sm:px-8 transition-colors">
      <div className="max-w-6xl mx-auto">
        {/* List Component dengan Search & Filter */}
        <ApplicantList initialRegistrations={initialRegistrations} divisions={divisions} />
      </div>
    </div>
  );
}
