"use client";

import React from "react";
import { OprecSettingsCard } from "@/components/organisms/OprecSettingsCard";
import {
  InterviewQuestionsEditor,
  DivisionOption,
} from "@/components/organisms/InterviewQuestionsEditor";
import { InterviewQuestionItem } from "@/app/actions/interviewQuestions";

interface OprecSettingsPageProps {
  initialSettings: {
    id: number;
    is_oprec: boolean;
    label: string;
    updated_at?: string;
  };
  initialQuestions?: InterviewQuestionItem[];
  canManage?: boolean;
  userRole?: string;
  divisions?: DivisionOption[];
}

export function OprecSettingsPage({
  initialSettings,
  initialQuestions = [],
  canManage = false,
  userRole = "admin",
  divisions = [],
}: OprecSettingsPageProps) {
  return (
    <div className="flex-1 bg-[#F9F9F8] dark:bg-[#09090b] min-h-screen py-6 px-4 sm:px-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Settings Card: Status OPREC & Label */}
        <OprecSettingsCard
          initialIsOprec={initialSettings.is_oprec}
          initialLabel={initialSettings.label}
          updatedAt={initialSettings.updated_at}
        />

        {/* Interview Questions Editor: General & Per Divisi */}
        <InterviewQuestionsEditor
          initialQuestions={initialQuestions}
          canManage={canManage}
          userRole={userRole}
          availableDivisions={divisions}
        />
      </div>
    </div>
  );
}
