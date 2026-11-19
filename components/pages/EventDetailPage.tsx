"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Users } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { EventScannerPanel } from "@/components/organisms/EventScannerPanel";
import { EventAttendeeTable } from "@/components/organisms/EventAttendeeTable";
import {
  DivisionEventSummary,
  EventAttendanceItem,
  TARGET_SCOPE_LABELS,
} from "@/utils/divisionEvents.types";
import { formatJakartaDateTime } from "@/utils/jakartaTime";

interface EventDetailPageProps {
  event: DivisionEventSummary;
  initialAttendees: EventAttendanceItem[];
  canManage: boolean;
}

export function EventDetailPage({
  event,
  initialAttendees,
  canManage,
}: EventDetailPageProps) {
  const [attendees, setAttendees] =
    useState<EventAttendanceItem[]>(initialAttendees);

  const presentCount = attendees.filter((a) => a.status === "present").length;

  const refreshAttendees = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("event_attendances")
      .select(
        "id, event_id, applicant_id, qr_token, status, checked_in_at, checked_in_by, created_at, applicants(id, full_name, nim, prodi, fakultas)"
      )
      .eq("event_id", event.id)
      .order("created_at", { ascending: true });

    if (data) {
      const mapped: EventAttendanceItem[] = data.map((row) => {
        const appRel = row.applicants as unknown as
          | EventAttendanceItem["applicant"]
          | null;
        return {
          id: row.id,
          event_id: row.event_id,
          applicant_id: row.applicant_id,
          qr_token: row.qr_token,
          status: row.status as EventAttendanceItem["status"],
          checked_in_at: row.checked_in_at,
          checked_in_by: row.checked_in_by,
          created_at: row.created_at,
          applicant: appRel,
        };
      });
      setAttendees(mapped);
    }
  }, [event.id]);

  return (
    <div className="flex-1 bg-[#F9F9F8] dark:bg-[#09090b] min-h-screen py-6 px-4 sm:px-8 transition-colors">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Back link */}
        <div>
          <Link
            href="/dashboard/acara"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-[#B22234] dark:text-zinc-400 dark:hover:text-rose-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Daftar Acara Divisi</span>
          </Link>
        </div>

        {/* Event Info Card */}
        <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/80 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#FCF2F3] dark:bg-rose-950/50 text-[#B22234] dark:text-rose-400 border border-[#F8D7DA] dark:border-rose-900/60">
              {event.division_name}
            </span>
            <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
              {TARGET_SCOPE_LABELS[event.target_scope]}
            </span>
          </div>

          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[#18181b] dark:text-zinc-100">
              {event.title}
            </h1>
            {event.description && (
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 mt-1">
                {event.description}
              </p>
            )}
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-600 dark:text-zinc-300">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              {formatJakartaDateTime(event.event_date)}
            </span>
            {event.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                {event.location}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              <Users className="w-3.5 h-3.5 text-[#B22234] dark:text-rose-400" />
              {presentCount} / {attendees.length} Hadir
            </span>
          </div>
        </div>

        {/* Camera Scanner */}
        <EventScannerPanel
          eventId={event.id}
          canManage={canManage}
          onCheckedIn={refreshAttendees}
        />

        {/* Daftar Data Tiket QR & Kehadiran */}
        <EventAttendeeTable
          eventId={event.id}
          attendees={attendees}
          canManage={canManage}
          onRefresh={refreshAttendees}
        />
      </div>
    </div>
  );
}

