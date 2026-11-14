"use client";

import React from "react";
import {
  ApplicantDetailCard,
  ApplicantDetailData,
  DivisionItem,
} from "@/components/organisms/ApplicantDetailCard";
import { InterviewQuestionItem } from "@/app/actions/interviewQuestions";
import type { ApplicantInterviewInfo } from "@/components/organisms/applicant-detail";

interface ApplicantDetailPageProps {
  applicant: ApplicantDetailData;
  interview?: ApplicantInterviewInfo | null;
  divisions?: DivisionItem[];
  interviewQuestions?: InterviewQuestionItem[];
  canAssess?: boolean;
  canDelete?: boolean;
}

export function ApplicantDetailPage({
  applicant,
  interview = null,
  divisions = [],
  interviewQuestions = [],
  canAssess = false,
  canDelete = false,
}: ApplicantDetailPageProps) {
  return (
    <div className="flex-1 bg-[#F9F9F8] dark:bg-[#09090b] min-h-screen py-6 px-4 sm:px-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Kartu Rincian Pendaftar */}
        <ApplicantDetailCard
          applicant={applicant}
          interview={interview}
          divisions={divisions}
          interviewQuestions={interviewQuestions}
          canAssess={canAssess}
          canDelete={canDelete}
        />
      </div>
    </div>
  );
}
