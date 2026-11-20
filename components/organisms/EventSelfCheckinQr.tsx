"use client";

import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/atoms/Button";

const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || "https://www.unsrobotika.or.id";

/** QR acara layar penuh: calon anggota memindai dengan kamera HP untuk absen sendiri. Kode berganti tiap 30 detik. */
export function EventSelfCheckinQr({ eventId, title }: { eventId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    const load = async () => {
      const { data, error: rpcError } = await supabase.rpc("get_event_checkin_code", { p_event_id: eventId });
      if (rpcError) setError(rpcError.message);
      else if (typeof data === "string") {
        setCode(data);
        setError(null);
      }
    };
    void load();
    const timer = setInterval(load, 5000);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      clearInterval(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, eventId]);

  const url = code ? `${WEBSITE_URL}/absen?e=${eventId}&c=${code}` : null;

  return (
    <>
      <Button type="button" variant="secondary" size="md" onClick={() => setOpen(true)} icon={<QrCode className="w-4 h-4" />}>
        Tampilkan QR Acara
      </Button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="QR acara untuk absen mandiri"
          className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center gap-4 p-4 text-zinc-900"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup QR"
            className="absolute top-4 right-4 p-2.5 rounded-full bg-zinc-100 hover:bg-zinc-200 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <p className="text-lg sm:text-2xl font-bold text-center">{title}</p>
          {url ? (
            <QRCodeSVG
              value={url}
              bgColor="#FFFFFF"
              fgColor="#000000"
              level="M"
              marginSize={2}
              title="QR absen acara"
              style={{ width: "min(85vw, 65vh)", height: "min(85vw, 65vh)" }}
            />
          ) : (
            <p className="text-sm text-zinc-500">{error || "Memuat QR…"}</p>
          )}
          <p className="text-sm text-center text-zinc-600 max-w-md">
            Pindai dengan kamera HP, lalu login akun pendaftaran. QR berganti otomatis tiap 30 detik, jadi foto QR tidak
            bisa dipakai dari luar lokasi.
          </p>
        </div>
      )}
    </>
  );
}
