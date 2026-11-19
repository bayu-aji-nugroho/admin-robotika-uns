"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  QrCode,
  Plus,
  MapPin,
  Clock,
  Users,
  ChevronRight,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/atoms/Button";
import { EventFormModal } from "@/components/organisms/EventFormModal";
import {
  DivisionEventSummary,
  DivisionOptionItem,
  TARGET_SCOPE_LABELS,
} from "@/utils/divisionEvents.types";
import { formatJakartaDateTime } from "@/utils/jakartaTime";

interface EventsPageProps {
  initialEvents: DivisionEventSummary[];
  divisions: DivisionOptionItem[];
  canManage: boolean;
}

export function EventsPage({
  initialEvents,
  divisions,
  canManage,
}: EventsPageProps) {
  const router = useRouter();
  const [events, setEvents] = useState<DivisionEventSummary[]>(initialEvents);
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredEvents = useMemo(() => {
    if (selectedDivision === "all") return events;
    return events.filter((ev) => ev.division_id === selectedDivision);
  }, [events, selectedDivision]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  const handleDeleteEvent = async (eventId: string, title: string) => {
    if (!canManage || deletingId) return;
    const confirmed = window.confirm(
      `Hapus acara "${title}" beserta seluruh data tiket QR pesertanya?`
    );
    if (!confirmed) return;

    try {
      setDeletingId(eventId);
      const supabase = createClient();
      const { error } = await supabase
        .from("division_events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;

      setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
      showToast(`Acara "${title}" berhasil dihapus.`);
      router.refresh();
    } catch {
      showToast("Gagal menghapus acara. Silakan coba lagi.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 bg-[#F9F9F8] dark:bg-[#09090b] min-h-screen py-6 px-4 sm:px-8 transition-colors">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-[#18181b] dark:text-zinc-100">
              <QrCode className="w-5 h-5 text-[#B22234] dark:text-rose-400" />
              Acara Divisi &amp; Presensi QR
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Buat acara per divisi untuk menyiapkan data tiket QR anggota dan
              memindai kehadiran via kamera.
            </p>
          </div>

          {canManage && (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => setIsModalOpen(true)}
              icon={<Plus className="w-4 h-4" />}
              className="self-start sm:self-auto"
            >
              Tambah Acara
            </Button>
          )}
        </div>

        {/* Toast feedback */}
        {toastMessage && (
          <div
            role="status"
            className="flex items-center gap-2 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 font-medium"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Filter Divisi */}
        <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/80 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <label
              htmlFor="filter-event-division"
              className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 shrink-0"
            >
              Filter Divisi:
            </label>
            <select
              id="filter-event-division"
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/70 rounded-lg text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden cursor-pointer"
            >
              <option value="all">Semua Divisi ({events.length})</option>
              {divisions.map((div) => (
                <option key={div.id} value={div.id}>
                  {div.name}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
            Menampilkan {filteredEvents.length} acara
          </span>
        </div>

        {/* List Kartu Acara */}
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEvents.map((ev) => {
              const pct =
                ev.total_attendees > 0
                  ? Math.round((ev.present_count / ev.total_attendees) * 100)
                  : 0;

              return (
                <div
                  key={ev.id}
                  className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/80 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#FCF2F3] dark:bg-rose-950/50 text-[#B22234] dark:text-rose-400 border border-[#F8D7DA] dark:border-rose-900/60">
                        {ev.division_name}
                      </span>

                      <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                        {TARGET_SCOPE_LABELS[ev.target_scope]}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-[#18181b] dark:text-zinc-100">
                        {ev.title}
                      </h2>
                      {ev.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                          {ev.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>{formatJakartaDateTime(ev.event_date)}</span>
                      </div>
                      {ev.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{ev.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress & Actions */}
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1.5 font-medium text-zinc-600 dark:text-zinc-400">
                          <Users className="w-3.5 h-3.5" />
                          Kehadiran &amp; Data Tiket QR
                        </span>
                        <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                          {ev.present_count} / {ev.total_attendees} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#B22234] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(ev.id, ev.title)}
                          disabled={deletingId === ev.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      ) : (
                        <span />
                      )}

                      <Link
                        href={`/dashboard/acara/${ev.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-[#B22234] dark:hover:bg-rose-500 dark:hover:text-white transition-colors"
                      >
                        <span>Buka Scanner &amp; Data Tiket</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/80 rounded-xl py-12 px-4 text-center space-y-2 shadow-xs">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Belum ada acara divisi
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              {canManage
                ? 'Klik tombol "Tambah Acara" untuk membuat acara divisi dan menyiapkan data tiket QR bagi calon anggota.'
                : "Acara divisi yang dibuat oleh admin akan muncul di sini."}
            </p>
          </div>
        )}
      </div>

      <EventFormModal
        isOpen={isModalOpen}
        divisions={divisions}
        onClose={() => setIsModalOpen(false)}
        onCreated={({ eventId, ticketsCreated }) => {
          setIsModalOpen(false);
          showToast(
            `Acara berhasil dibuat. ${ticketsCreated} data tiket QR anggota telah disiapkan.`
          );
          if (eventId) {
            router.push(`/dashboard/acara/${eventId}`);
          }
          router.refresh();
        }}
      />
    </div>
  );
}

