"use client";

import React from "react";
import { InterviewScheduleManager } from "@/components/organisms/InterviewScheduleManager";
import type {
  InterviewPair,
  PairAvailabilitySlot,
  ScheduleAdmin,
  ScheduledInterview,
  ScheduleViewer,
} from "@/utils/interviewSchedule.types";

interface InterviewSchedulePageProps {
  viewer: ScheduleViewer;
  admins: ScheduleAdmin[];
  pairs: InterviewPair[];
  availability: PairAvailabilitySlot[];
  scheduled: ScheduledInterview[];
}

export function InterviewSchedulePage(props: InterviewSchedulePageProps) {
  return (
    <div className="flex-1 bg-[#F9F9F8] dark:bg-[#09090b] min-h-screen py-6 px-4 sm:px-8 transition-colors">
      <div className="max-w-5xl mx-auto space-y-6">
        <InterviewScheduleManager {...props} />
      </div>
    </div>
  );
}
