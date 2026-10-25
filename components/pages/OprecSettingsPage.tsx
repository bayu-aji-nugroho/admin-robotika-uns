"use client";

import React from "react";
import { OprecSettingsCard } from "@/components/organisms/OprecSettingsCard";

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
    <div className="flex-1 bg-[#F9F9F8] dark:bg-[#09090b] min-h-screen py-6 px-4 sm:px-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Settings Card */}
        <OprecSettingsCard
          initialIsOprec={initialSettings.is_oprec}
          initialLabel={initialSettings.label}
          updatedAt={initialSettings.updated_at}
        />
      </div>
    </div>
  );
}
