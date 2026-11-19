"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/atoms/Button";

interface ScanFeedback {
  kind: "success" | "warning" | "error";
  title: string;
  detail: string;
}

interface EventScannerPanelProps {
  eventId: string;
  canManage: boolean;
  onCheckedIn: () => void;
}

export function EventScannerPanel({
  eventId,
  canManage,
  onCheckedIn,
}: EventScannerPanelProps) {
  const readerId = `qr-reader-${eventId}`;
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const lastScannedRef = useRef<{ token: string; at: number }>({
    token: "",
    at: 0,
  });

  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);

  const stopScanner = async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    } catch {
      // Abaikan error saat membersihkan kamera
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  const handleTokenScanned = async (rawToken: string) => {
    const token = rawToken.trim();
    if (!token) return;

    const now = Date.now();
    // Cooldown 2.5 detik agar QR yang sama tidak terpindai berulang kali
    if (
      lastScannedRef.current.token === token &&
      now - lastScannedRef.current.at < 2500
    ) {
      return;
    }
    lastScannedRef.current = { token, at: now };

    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("check_in_event_qr", {
        p_event_id: eventId,
        p_qr_token: token,
      });

      if (error) {
        setFeedback({
          kind: "error",
          title: "Gagal Memproses QR",
          detail: error.message,
        });
        return;
      }

      const res = (data || {}) as {
        ok?: boolean;
        code?: string;
        message?: string;
        applicant?: {
          full_name?: string;
          nim?: string;
          prodi?: string;
        };
      };

      const applicantLabel = res.applicant?.full_name
        ? `${res.applicant.full_name} (${res.applicant.nim || "-"})`
        : "Peserta";

      if (res.ok && res.code === "checked_in") {
        setFeedback({
          kind: "success",
          title: `Hadir: ${applicantLabel}`,
          detail: res.applicant?.prodi || "Kehadiran berhasil dicatat.",
        });
        onCheckedIn();
      } else if (res.code === "already_present") {
        setFeedback({
          kind: "warning",
          title: `Sudah Absen: ${applicantLabel}`,
          detail: "QR Code ini sudah dipindai sebelumnya.",
        });
      } else {
        setFeedback({
          kind: "error",
          title: "QR Tidak Valid",
          detail: res.message || "QR Code tidak terdaftar di acara ini.",
        });
      }
    } catch {
      setFeedback({
        kind: "error",
        title: "Koneksi Bermasalah",
        detail: "Tidak dapat menghubungi server untuk memverifikasi QR.",
      });
    }
  };

  const startScanner = async () => {
    if (!canManage || isStarting || isScanning) return;
    try {
      setIsStarting(true);
      setCameraError(null);
      setFeedback(null);

      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(readerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1,
        },
        (decodedText) => {
          void handleTokenScanned(decodedText);
        },
        () => {
          // Frame tidak berisi QR: abaikan
        }
      );

      setIsScanning(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Kamera tidak dapat diakses. Pastikan izin kamera diizinkan.";
      setCameraError(msg);
      setIsScanning(false);
    } finally {
      setIsStarting(false);
    }
  };

  if (!canManage) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/80 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#B22234] dark:text-rose-400" />
            Scanner Kamera QR Kehadiran
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Arahkan kamera ke QR Code yang ditampilkan di website peserta.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!isScanning ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={startScanner}
              isLoading={isStarting}
              icon={<Camera className="w-4 h-4" />}
            >
              Aktifkan Kamera
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => void stopScanner()}
              icon={<CameraOff className="w-4 h-4" />}
            >
              Matikan Kamera
            </Button>
          )}
        </div>
      </div>

      {cameraError && (
        <div
          role="alert"
          className="p-3 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-800 dark:text-rose-300"
        >
          {cameraError}
        </div>
      )}

      {/* Viewport kamera */}
      <div
        className={`mx-auto w-full max-w-sm rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 ${
          isScanning ? "block" : "hidden"
        }`}
      >
        <div id={readerId} className="w-full" />
      </div>

      {/* Feedback hasil scan */}
      {feedback && (
        <div
          role="status"
          className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-xs sm:text-sm ${
            feedback.kind === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : feedback.kind === "warning"
              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          {feedback.kind === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : feedback.kind === "warning" ? (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-bold">{feedback.title}</p>
            <p className="text-xs opacity-90 mt-0.5">{feedback.detail}</p>
          </div>
        </div>
      )}
    </div>
  );
}

