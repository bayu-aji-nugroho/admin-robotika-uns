"use client";

import React from "react";
import {
  ApplicantDetailCard,
  ApplicantDetailData,
  DivisionItem,
} from "@/components/organisms/ApplicantDetailCard";
import { InterviewQuestionItem } from "@/app/actions/interviewQuestions";

interface ApplicantDetailPageProps {
  applicant: ApplicantDetailData;
  divisions?: DivisionItem[];
  interviewQuestions?: InterviewQuestionItem[];
}

export function ApplicantDetailPage({
  applicant,
  divisions = [],
  interviewQuestions = [],
}: ApplicantDetailPageProps) {
  return (
    <div className="flex-1 bg-[#F9F9F8] dark:bg-[#09090b] min-h-screen py-6 px-4 sm:px-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Kartu Rincian Pendaftar */}
        <ApplicantDetailCard
          applicant={applicant}
          divisions={divisions}
          interviewQuestions={interviewQuestions}
        />
      </div>
    </div>
  );
}
