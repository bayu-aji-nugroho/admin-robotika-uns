"use client";

import React from "react";
import { OprecSettingsCard } from "@/components/organisms/OprecSettingsCard";
import {
  InterviewQuestionsEditor,
  DivisionOption,
} from "@/components/organisms/InterviewQuestionsEditor";
import { InterviewQuestionItem } from "@/app/actions/interviewQuestions";
import {
  ApplicantEmailWhitelistCard,
  type ApplicantEmailWhitelistItem,
} from "@/components/organisms/ApplicantEmailWhitelistCard";

interface OprecSettingsPageProps {
  initialSettings: {
    id: number;
    is_oprec: boolean;
    label: string;
    announcement_at?: string | null;
    oprec_open_at?: string | null;
    oprec_close_at?: string | null;
    interview_booking_deadline?: string | null;
    oprec_banner_color?: string | null;
    updated_at?: string;
  };
  initialQuestions?: InterviewQuestionItem[];
  canManage?: boolean;
  canEditSettings?: boolean;
  /** null = tidak berhak melihat pengecualian login SSO */
  emailWhitelist?: ApplicantEmailWhitelistItem[] | null;
  userRole?: string;
  divisions?: DivisionOption[];
}

export function OprecSettingsPage({
  initialSettings,
  initialQuestions = [],
  canManage = false,
  canEditSettings = false,
  emailWhitelist = null,
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
          initialAnnouncementAt={initialSettings.announcement_at ?? null}
          initialOpenAt={initialSettings.oprec_open_at ?? null}
          initialCloseAt={initialSettings.oprec_close_at ?? null}
          initialInterviewDeadline={initialSettings.interview_booking_deadline ?? null}
          initialBannerColor={initialSettings.oprec_banner_color ?? null}
          updatedAt={initialSettings.updated_at}
          canEdit={canEditSettings}
        />

        {/* Pengecualian login SSO untuk calon anggota yang akun SSO-nya bermasalah */}
        {emailWhitelist && <ApplicantEmailWhitelistCard items={emailWhitelist} canEdit={canEditSettings} />}

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
