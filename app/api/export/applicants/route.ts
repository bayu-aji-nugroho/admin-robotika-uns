import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { createClient } from "@/utils/supabase/server";
import { getAdminAccess, hasPermission } from "@/utils/adminAccess";
import { formatJakartaDateTime, JAKARTA_TIME_ZONE } from "@/utils/jakartaTime";

// Ekspor PDF sederhana daftar calon anggota (status submitted).
// Query ?division=all (default) | unplaced | <id divisi diterima>

interface RegistrationRow {
  id: string;
  full_name: string | null;
  nim: string | null;
  whatsapp: string | null;
  prodi: string | null;
  angkatan: string | null;
  primary_division_name: string | null;
  secondary_division_name: string | null;
  accepted_division_id: string | null;
  accepted_division_name: string | null;
  assessment_status: string | null;
}

interface BookingRow {
  applicant_id: string;
  start_at: string;
  status: "pending" | "accepted";
}

const ASSESSMENT_LABEL: Record<string, string> = {
  pertimbangan: "Pertimbangan",
  diterima: "Diterima",
  ditolak: "Ditolak",
};

const BRAND_RED: [number, number, number] = [178, 34, 52];

function formatInterview(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("id-ID", {
    timeZone: JAKARTA_TIME_ZONE,
    day: "2-digit",
    month: "short",
  });
  const time = d.toLocaleTimeString("id-ID", {
    timeZone: JAKARTA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date}, ${time}`;
}

function slugify(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "") || "Divisi";
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "Sesi tidak sah. Silakan login kembali." }, { status: 401 });
  }

  const access = await getAdminAccess(supabase, user.email);
  if (!hasPermission(access, "applicants.view")) {
    return NextResponse.json(
      { error: "Akses ditolak: Role Anda tidak memiliki hak melihat pendaftar." },
      { status: 403 }
    );
  }

  const division = (new URL(request.url).searchParams.get("division") || "all").trim();

  const [registrationsResult, bookingsResult, divisionsResult] = await Promise.all([
    supabase
      .from("view_registrations")
      .select(
        "id, full_name, nim, whatsapp, prodi, angkatan, primary_division_name, secondary_division_name, accepted_division_id, accepted_division_name, assessment_status"
      )
      .eq("status", "submitted"),
    supabase.from("interview_bookings").select("applicant_id, start_at, status"),
    supabase.from("divisions").select("id, name"),
  ]);

  if (registrationsResult.error) {
    return NextResponse.json({ error: registrationsResult.error.message }, { status: 500 });
  }

  const divisionName = new Map((divisionsResult.data || []).map((d) => [d.id, d.name]));
  if (division !== "all" && division !== "unplaced" && !divisionName.has(division)) {
    return NextResponse.json({ error: "Divisi tidak ditemukan." }, { status: 400 });
  }

  const bookings = new Map(
    ((bookingsResult.data as BookingRow[]) || []).map((b) => [b.applicant_id, b])
  );

  const rows = ((registrationsResult.data as RegistrationRow[]) || [])
    .filter((r) =>
      division === "all"
        ? true
        : division === "unplaced"
        ? !r.accepted_division_id
        : r.accepted_division_id === division
    )
    .sort(
      (a, b) =>
        (a.accepted_division_name || "~").localeCompare(b.accepted_division_name || "~", "id") ||
        (a.full_name || "").localeCompare(b.full_name || "", "id")
    );

  const filterLabel =
    division === "all"
      ? "Semua Divisi"
      : division === "unplaced"
      ? "Belum Ditempatkan"
      : `Divisi ${divisionName.get(division)}`;

  // --- Susun PDF ---------------------------------------------------------
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const printedAt = formatJakartaDateTime(new Date().toISOString());

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Daftar Calon Anggota OPREC Robotika UNS", 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(`Filter: ${filterLabel}  ·  Total: ${rows.length} orang  ·  Dicetak: ${printedAt}`, 14, 22);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 27,
    head: [
      [
        "No",
        "Nama",
        "NIM",
        "Prodi (Angkatan)",
        "WhatsApp",
        "Pilihan 1",
        "Pilihan 2",
        "Divisi Diterima",
        "Status",
        "Wawancara",
      ],
    ],
    body: rows.map((r, i) => {
      const booking = bookings.get(r.id);
      return [
        String(i + 1),
        r.full_name || "-",
        r.nim || "-",
        `${r.prodi || "-"}${r.angkatan ? ` (${r.angkatan})` : ""}`,
        r.whatsapp || "-",
        r.primary_division_name || "-",
        r.secondary_division_name || "-",
        r.accepted_division_name || "-",
        ASSESSMENT_LABEL[(r.assessment_status || "").toLowerCase()] || r.assessment_status || "-",
        booking
          ? `${formatInterview(booking.start_at)}${booking.status === "accepted" ? "" : " (belum konfirmasi)"}`
          : "-",
      ];
    }),
    styles: { font: "helvetica", fontSize: 7.5, cellPadding: 1.6, overflow: "linebreak", valign: "middle" },
    headStyles: { fillColor: BRAND_RED, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 248, 247] },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 38 },
      2: { cellWidth: 20 },
      3: { cellWidth: 36 },
      4: { cellWidth: 24 },
      8: { cellWidth: 20 },
      9: { cellWidth: 28 },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(7.5);
      doc.setTextColor(140);
      doc.text("UKM Robotika Universitas Sebelas Maret", 14, pageHeight - 7);
      doc.text(`Halaman ${doc.getNumberOfPages()}`, pageWidth - 14, pageHeight - 7, { align: "right" });
      doc.setTextColor(0);
    },
  });

  if (rows.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("Tidak ada calon anggota untuk filter ini.", 14, 40);
  }

  const buffer = doc.output("arraybuffer");
  const dateStamp = new Intl.DateTimeFormat("en-CA", { timeZone: JAKARTA_TIME_ZONE }).format(new Date());
  const fileName = `Calon_Anggota_Robotika_UNS_${slugify(filterLabel)}_${dateStamp}.pdf`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
