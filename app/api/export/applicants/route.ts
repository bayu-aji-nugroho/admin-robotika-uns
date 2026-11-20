import { NextResponse, connection } from "next/server";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { createClient } from "@/utils/supabase/server";
import { getAdminAccess, hasPermission } from "@/utils/adminAccess";
import { formatJakartaDateTime, JAKARTA_TIME_ZONE } from "@/utils/jakartaTime";
import {
  LIST_COLUMNS,
  describeExportFilters,
  matchesExportFilters,
  normalizeAssessment,
  parseExportOptions,
  slugifyFileLabel,
  type ListColumnKey,
} from "@/utils/exportOptions";

// Ekspor PDF daftar calon anggota (status submitted).
// Query: lihat utils/exportOptions.ts (division, basis, status, interview, columns)

export const maxDuration = 60;

interface RegistrationRow {
  id: string;
  full_name: string | null;
  nim: string | null;
  whatsapp: string | null;
  prodi: string | null;
  angkatan: string | null;
  primary_division_id: string | null;
  primary_division_name: string | null;
  secondary_division_id: string | null;
  secondary_division_name: string | null;
  accepted_division_id: string | null;
  accepted_division_name: string | null;
  assessment_status: string | null;
}

interface BookingRow {
  applicant_id: string;
  start_at: string;
  status: "pending" | "accepted";
  completed_at: string | null;
  interviewer_ids: string[] | null;
}

const ASSESSMENT_LABEL: Record<string, string> = {
  pertimbangan: "Pertimbangan",
  diterima: "Diterima",
  ditolak: "Ditolak",
};

const BRAND_RED: [number, number, number] = [178, 34, 52];

// Lebar kolom tetap (mm); kolom lain berbagi sisa lebar halaman
const COLUMN_WIDTH: Partial<Record<ListColumnKey | "no" | "name", number>> = {
  no: 8,
  name: 38,
  nim: 20,
  prodi: 34,
  whatsapp: 24,
  status: 20,
  interview: 30,
};

function formatInterview(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("id-ID", { timeZone: JAKARTA_TIME_ZONE, day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString("id-ID", { timeZone: JAKARTA_TIME_ZONE, hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
}

export async function GET(request: Request) {
  // Selalu dinamis (butuh cookie sesi); di luar try agar tidak ikut tertangkap saat build
  await connection();
  try {
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

    const opts = parseExportOptions(new URL(request.url).searchParams);

    const [registrationsResult, bookingsResult, divisionsResult, adminsResult] = await Promise.all([
      supabase
        .from("view_registrations")
        .select(
          "id, full_name, nim, whatsapp, prodi, angkatan, primary_division_id, primary_division_name, secondary_division_id, secondary_division_name, accepted_division_id, accepted_division_name, assessment_status"
        )
        .eq("status", "submitted"),
      supabase.from("interview_bookings").select("applicant_id, start_at, status, completed_at, interviewer_ids"),
      supabase.from("divisions").select("id, name"),
      opts.columns.includes("interviewers")
        ? supabase.from("admin_whitelist").select("id, full_name, email")
        : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string }[] }),
    ]);

    if (registrationsResult.error) {
      return NextResponse.json({ error: registrationsResult.error.message }, { status: 500 });
    }

    const divisionName = new Map((divisionsResult.data || []).map((d) => [d.id, d.name]));
    if (opts.division !== "all" && opts.division !== "unplaced" && !divisionName.has(opts.division)) {
      return NextResponse.json({ error: "Divisi tidak ditemukan." }, { status: 400 });
    }

    const bookings = new Map(((bookingsResult.data as BookingRow[]) || []).map((b) => [b.applicant_id, b]));
    const adminName = new Map(
      (adminsResult.data || []).map((a) => [a.id, a.full_name || a.email.split("@")[0]])
    );

    // Basis Pilihan 1 / Pilihan 1 atau 2: kelompokkan per Pilihan 1 tiap calon
    const groupOf = (r: RegistrationRow) =>
      (opts.basis === "accepted" ? r.accepted_division_name : r.primary_division_name) || "~";
    const rows = ((registrationsResult.data as RegistrationRow[]) || [])
      .filter((r) => matchesExportFilters(r, bookings.get(r.id), opts))
      .sort(
        (a, b) =>
          groupOf(a).localeCompare(groupOf(b), "id") ||
          (a.full_name || "").localeCompare(b.full_name || "", "id")
      );

    const filterLabel = describeExportFilters(opts, divisionName);
    const columns = LIST_COLUMNS.filter((c) => opts.columns.includes(c.key));

    const cellOf = (r: RegistrationRow, key: ListColumnKey): string => {
      const booking = bookings.get(r.id);
      switch (key) {
        case "nim":
          return r.nim || "-";
        case "prodi":
          return `${r.prodi || "-"}${r.angkatan ? ` (${r.angkatan})` : ""}`;
        case "whatsapp":
          return r.whatsapp || "-";
        case "primary":
          return r.primary_division_name || "-";
        case "secondary":
          return r.secondary_division_name || "-";
        case "accepted":
          return r.accepted_division_name || "-";
        case "status":
          return ASSESSMENT_LABEL[normalizeAssessment(r.assessment_status)];
        case "interview":
          if (!booking) return "-";
          return `${formatInterview(booking.start_at)}${
            booking.completed_at ? " (selesai)" : booking.status === "accepted" ? "" : " (belum konfirmasi)"
          }`;
        case "interviewers":
          return booking ? (booking.interviewer_ids || []).map((id) => adminName.get(id) || "-").join(" & ") || "-" : "-";
      }
    };

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

    const keys: (ListColumnKey | "no" | "name")[] = ["no", "name", ...columns.map((c) => c.key)];
    autoTable(doc, {
      startY: 27,
      head: [["No", "Nama", ...columns.map((c) => c.label)]],
      body: rows.flatMap((r, i) => {
        const row = [String(i + 1), r.full_name || "-", ...columns.map((c) => cellOf(r, c.key))];
        if (opts.basis === "accepted" || (i > 0 && groupOf(rows[i - 1]) === groupOf(r))) return [row];
        const total = rows.filter((x) => groupOf(x) === groupOf(r)).length;
        const label = groupOf(r) === "~" ? "Tanpa Pilihan 1" : `Pilihan 1: ${groupOf(r)}`;
        return [
          [{ content: `${label} (${total} orang)`, colSpan: keys.length, styles: { fontStyle: "bold" as const, fillColor: [252, 242, 243] as [number, number, number], textColor: BRAND_RED } }],
          row,
        ];
      }),
      styles: { font: "helvetica", fontSize: 7.5, cellPadding: 1.6, overflow: "linebreak", valign: "middle" },
      headStyles: { fillColor: BRAND_RED, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 248, 247] },
      columnStyles: Object.fromEntries(
        keys.flatMap((k, i) =>
          COLUMN_WIDTH[k] ? [[i, { cellWidth: COLUMN_WIDTH[k], ...(k === "no" ? { halign: "center" as const } : {}) }]] : []
        )
      ),
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
    const fileName = `Calon_Anggota_Robotika_UNS_${slugifyFileLabel(filterLabel)}_${dateStamp}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    console.error("Ekspor daftar pendaftar gagal:", err);
    return NextResponse.json(
      { error: `Gagal membuat PDF: ${err instanceof Error ? err.message : "kesalahan tidak diketahui"}` },
      { status: 500 }
    );
  }
}
