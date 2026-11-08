import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { createClient } from "@/utils/supabase/server";
import { getAdminAccess, hasPermission } from "@/utils/adminAccess";
import { formatJakartaDateTime, formatJakartaHourRange, formatJakartaDate, JAKARTA_TIME_ZONE } from "@/utils/jakartaTime";
import {
  GroupableQuestion,
  INTERVIEW_NOTES_KEY,
  groupInterviewQuestions,
} from "@/utils/interviewQuestionGroups";

// Lembar hasil wawancara (pertanyaan + jawaban), 1 bagian per calon anggota.
// Query:
//   ?applicant=<id>                       -> satu calon anggota
//   ?division=all | unplaced | <id divisi> -> banyak calon anggota (divisi diterima)

interface ApplicantRow {
  id: string;
  registration_code: string | null;
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
  assessment_notes: string | null;
  interview_answers: Record<string, string> | null;
}

interface BookingRow {
  applicant_id: string;
  start_at: string;
  status: "pending" | "accepted";
  location: string | null;
  interviewer_ids: string[];
}

const BRAND_RED: [number, number, number] = [178, 34, 52];
const MARGIN = 14;
const ASSESSMENT_LABEL: Record<string, string> = {
  pertimbangan: "Pertimbangan",
  diterima: "Diterima",
  ditolak: "Ditolak",
};

const SELECT_COLUMNS =
  "id, registration_code, full_name, nim, whatsapp, prodi, angkatan, primary_division_id, primary_division_name, secondary_division_id, secondary_division_name, accepted_division_id, accepted_division_name, assessment_status, assessment_notes, interview_answers";

function lastY(doc: jsPDF, fallback: number) {
  return (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? fallback;
}

function slugify(value: string) {
  return value.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "") || "Lembar";
}

/** Pastikan ada ruang minimal di halaman; jika tidak, pindah ke halaman baru. */
function ensureSpace(doc: jsPDF, y: number, needed: number) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 18) {
    doc.addPage();
    return 18;
  }
  return y;
}

function drawSectionTitle(doc: jsPDF, y: number, title: string) {
  y = ensureSpace(doc, y, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_RED);
  doc.text(title, MARGIN, y);
  doc.setTextColor(0);
  return y + 2;
}

function drawApplicant(
  doc: jsPDF,
  applicant: ApplicantRow,
  questions: GroupableQuestion[],
  booking: BookingRow | undefined,
  adminNames: Map<string, string>
) {
  const answers = applicant.interview_answers || {};
  const pageWidth = doc.internal.pageSize.getWidth();

  // Kop
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Lembar Hasil Wawancara", MARGIN, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100);
  doc.text("OPREC UKM Robotika Universitas Sebelas Maret", MARGIN, 23);
  doc.setTextColor(0);
  doc.setDrawColor(...BRAND_RED);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, 26, pageWidth - MARGIN, 26);

  // Identitas
  const interviewText = booking
    ? `${formatJakartaDate(booking.start_at)}, ${formatJakartaHourRange(booking.start_at)} WIB${
        booking.status === "accepted" ? "" : " (belum dikonfirmasi)"
      }`
    : "-";
  const interviewers = booking
    ? (booking.interviewer_ids || []).map((id) => adminNames.get(id) || "-").join(" & ")
    : "-";

  autoTable(doc, {
    startY: 30,
    theme: "plain",
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: { top: 0.8, bottom: 0.8, left: 0, right: 2 } },
    columnStyles: {
      0: { cellWidth: 30, textColor: 110 },
      1: { cellWidth: 61, fontStyle: "bold" },
      2: { cellWidth: 30, textColor: 110 },
      3: { fontStyle: "bold" },
    },
    margin: { left: MARGIN, right: MARGIN },
    body: [
      ["Nama", applicant.full_name || "-", "No. Registrasi", applicant.registration_code || "-"],
      ["NIM", applicant.nim || "-", "WhatsApp", applicant.whatsapp || "-"],
      [
        "Prodi (Angkatan)",
        `${applicant.prodi || "-"}${applicant.angkatan ? ` (${applicant.angkatan})` : ""}`,
        "Status Penilaian",
        ASSESSMENT_LABEL[(applicant.assessment_status || "").toLowerCase()] || applicant.assessment_status || "-",
      ],
      ["Pilihan 1", applicant.primary_division_name || "-", "Pilihan 2", applicant.secondary_division_name || "-"],
      ["Divisi Diterima", applicant.accepted_division_name || "-", "Pewawancara", interviewers],
      ["Jadwal Wawancara", interviewText, "Lokasi", booking?.location || "-"],
    ],
  });

  let y = lastY(doc, 30) + 7;

  // Pertanyaan + jawaban per kelompok
  const groups = groupInterviewQuestions(questions, applicant);
  const sections: { title: string; items: GroupableQuestion[] }[] = [
    { title: "Pertanyaan Umum", items: groups.general },
    { title: `Divisi Pilihan 1: ${applicant.primary_division_name || "-"}`, items: groups.primary },
    { title: `Divisi Pilihan 2: ${applicant.secondary_division_name || "-"}`, items: groups.secondary },
  ].filter((s) => s.items.length > 0);

  if (sections.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("Belum ada pertanyaan wawancara untuk divisi pendaftar ini.", MARGIN, y);
    doc.setTextColor(0);
    y += 8;
  }

  for (const section of sections) {
    y = drawSectionTitle(doc, y, `${section.title}  (${section.items.length} soal)`);
    autoTable(doc, {
      startY: y,
      head: [["No", "Pertanyaan", "Jawaban / Catatan Pewawancara"]],
      body: section.items.map((q, i) => {
        const answer = (answers[q.id] || "").trim();
        return [String(i + 1), q.question, answer || "-"];
      }),
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2, valign: "top", overflow: "linebreak" },
      headStyles: { fillColor: BRAND_RED, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 248, 247] },
      columnStyles: {
        0: { cellWidth: 9, halign: "center" },
        1: { cellWidth: 78, fontStyle: "bold" },
      },
      margin: { left: MARGIN, right: MARGIN, top: 18 },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 2 && data.cell.raw === "-") {
          data.cell.styles.textColor = 160;
        }
      },
    });
    y = lastY(doc, y) + 7;
  }

  // Catatan
  const specialNotes = (answers[INTERVIEW_NOTES_KEY] || "").trim();
  const assessmentNotes = (applicant.assessment_notes || "").trim();
  if (specialNotes || assessmentNotes) {
    y = drawSectionTitle(doc, y, "Catatan");
    autoTable(doc, {
      startY: y,
      theme: "grid",
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2, valign: "top" },
      columnStyles: { 0: { cellWidth: 40, fontStyle: "bold", fillColor: [248, 248, 247] } },
      margin: { left: MARGIN, right: MARGIN, top: 18 },
      body: [
        ...(specialNotes ? [["Catatan Khusus Wawancara", specialNotes]] : []),
        ...(assessmentNotes ? [["Catatan Penilaian", assessmentNotes]] : []),
      ],
    });
  }
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

  const params = new URL(request.url).searchParams;
  const applicantId = (params.get("applicant") || "").trim();
  const division = (params.get("division") || "all").trim();

  let applicantQuery = supabase.from("view_registrations").select(SELECT_COLUMNS).eq("status", "submitted");
  if (applicantId) {
    applicantQuery = applicantQuery.eq("id", applicantId);
  }

  const [applicantsResult, questionsResult, bookingsResult, adminsResult, divisionsResult] = await Promise.all([
    applicantQuery,
    supabase
      .from("interview_questions")
      .select("id, question, division, order_index")
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("interview_bookings").select("applicant_id, start_at, status, location, interviewer_ids"),
    supabase.from("admin_whitelist").select("id, full_name, email"),
    supabase.from("divisions").select("id, name"),
  ]);

  if (applicantsResult.error) {
    return NextResponse.json({ error: applicantsResult.error.message }, { status: 500 });
  }

  const divisionName = new Map((divisionsResult.data || []).map((d) => [d.id, d.name]));
  if (!applicantId && division !== "all" && division !== "unplaced" && !divisionName.has(division)) {
    return NextResponse.json({ error: "Divisi tidak ditemukan." }, { status: 400 });
  }

  const applicants = ((applicantsResult.data as unknown as ApplicantRow[]) || [])
    .filter((a) =>
      applicantId || division === "all"
        ? true
        : division === "unplaced"
        ? !a.accepted_division_id
        : a.accepted_division_id === division
    )
    .sort(
      (a, b) =>
        (a.accepted_division_name || "~").localeCompare(b.accepted_division_name || "~", "id") ||
        (a.full_name || "").localeCompare(b.full_name || "", "id")
    );

  if (applicantId && applicants.length === 0) {
    return NextResponse.json(
      { error: "Pendaftar tidak ditemukan atau belum mengirim formulir." },
      { status: 404 }
    );
  }

  const questions = (questionsResult.data as GroupableQuestion[]) || [];
  const bookings = new Map(((bookingsResult.data as BookingRow[]) || []).map((b) => [b.applicant_id, b]));
  const adminNames = new Map(
    (adminsResult.data || []).map((a) => [a.id, a.full_name || a.email.split("@")[0]])
  );

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  if (applicants.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Tidak ada calon anggota untuk filter ini.", MARGIN, 20);
  }

  applicants.forEach((applicant, idx) => {
    if (idx > 0) doc.addPage();
    drawApplicant(doc, applicant, questions, bookings.get(applicant.id), adminNames);
  });

  // Footer semua halaman
  const printedAt = formatJakartaDateTime(new Date().toISOString());
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(140);
    doc.text(`Dicetak ${printedAt}`, MARGIN, pageHeight - 8);
    doc.text(`Halaman ${page} dari ${totalPages}`, pageWidth - MARGIN, pageHeight - 8, { align: "right" });
    doc.setTextColor(0);
  }

  const label = applicantId
    ? applicants[0].full_name || applicants[0].nim || "Pendaftar"
    : division === "all"
    ? "Semua_Divisi"
    : division === "unplaced"
    ? "Belum_Ditempatkan"
    : divisionName.get(division) || "Divisi";
  const dateStamp = new Intl.DateTimeFormat("en-CA", { timeZone: JAKARTA_TIME_ZONE }).format(new Date());
  const fileName = `Lembar_Wawancara_${slugify(label)}_${dateStamp}.pdf`;

  return new NextResponse(doc.output("arraybuffer"), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
