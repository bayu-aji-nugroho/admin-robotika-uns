"use client";

import React, { useState } from "react";
import { MapPin, Save } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { setBookingLocationAction } from "@/app/actions/interviewSchedule";

const LOCATION_PRESETS = ["Sekretariat Robotika UNS", "Online (Google Meet)"];

interface BookingLocationEditorProps {
  bookingId: string;
  location: string | null;
  /** Jumlah sesi lain milik pasangan yang sama di tanggal yang sama */
  sameDayOthers: number;
  onResult: (type: "success" | "error", message: string) => void;
}

/** Input lokasi/link per sesi wawancara, diisi pewawancara setelah disepakati via WhatsApp */
export function BookingLocationEditor({ bookingId, location, sameDayOthers, onResult }: BookingLocationEditorProps) {
  const initial = location || "";
  const [value, setValue] = useState(initial);
  const [applySameDay, setApplySameDay] = useState(false);
  const [busy, setBusy] = useState(false);

  const isDirty = value.trim() !== initial || (applySameDay && value.trim() !== "");

  const handleSave = async () => {
    setBusy(true);
    const res = await setBookingLocationAction(bookingId, value, applySameDay);
    setBusy(false);
    if (!res.success) {
      onResult("error", res.error || "Gagal menyimpan lokasi.");
      return;
    }
    const count = res.data || 0;
    onResult(
      "success",
      !value.trim()
        ? "Lokasi dihapus."
        : count > 1
        ? `Lokasi disimpan untuk ${count} sesi.`
        : "Lokasi disimpan. Calon anggota langsung bisa melihatnya."
    );
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={300}
            placeholder="Lokasi atau link (mis. https://meet.google.com/...)"
            disabled={busy}
            aria-label="Lokasi wawancara"
            className="w-full pl-8 pr-3 py-2 bg-white dark:bg-zinc-950 border border-[#E4E4E7] dark:border-zinc-700/80 rounded-lg text-xs text-[#18181b] dark:text-zinc-100 placeholder-zinc-400 focus:border-[#B22234] focus:ring-1 focus:ring-[#B22234] focus:outline-hidden transition-colors"
          />
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleSave}
          isLoading={busy}
          disabled={busy || !isDirty}
          icon={<Save className="w-3.5 h-3.5" />}
        >
          Simpan
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {LOCATION_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setValue(preset)}
            disabled={busy}
            className="px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-[10px] font-medium text-zinc-600 dark:text-zinc-300 hover:border-[#B22234]/60 cursor-pointer disabled:opacity-50"
          >
            {preset}
          </button>
        ))}
        {sameDayOthers > 0 && (
          <label className="inline-flex items-center gap-1.5 ml-auto text-[10px] text-zinc-500 dark:text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={applySameDay}
              onChange={(e) => setApplySameDay(e.target.checked)}
              disabled={busy}
              className="accent-[#B22234] cursor-pointer"
            />
            Terapkan ke semua sesi hari ini ({sameDayOthers + 1} sesi)
          </label>
        )}
      </div>
    </div>
  );
}
