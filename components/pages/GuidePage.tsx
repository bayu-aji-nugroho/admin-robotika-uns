import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  ListChecks,
  BookOpen,
  CalendarClock,
  Check,
  Crown,
  FileText,
  KeyRound,
  LogIn,
  Minus,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  UserCheck,
  Users,
} from "lucide-react";
import { ADMIN_PERMISSIONS, AdminPermission } from "@/utils/permissions";
import { GuideToc, type GuideTocItem } from "@/components/organisms/GuideToc";

interface GuidePageProps {
  viewer: {
    name: string;
    isSuperadmin: boolean;
    roleName: string | null;
    permissions: AdminPermission[];
  };
}

interface GuideStep {
  title: string;
  detail: React.ReactNode;
}

interface GuideSection {
  id: string;
  title: string;
  icon: React.ElementType;
  href?: string;
  /** Izin yang dibutuhkan (kosong = semua admin) */
  requires: string;
  intro: string;
  steps: GuideStep[];
  tips?: string[];
  /** Penjelasan status/label yang tampil di halaman, dikelompokkan per bagian */
  statuses?: { group: string; items: { label: string; tone: StatusTone; meaning: string }[] }[];
  /** Gambar tutorial beranotasi (di folder public/guide) */
  image?: { src: string; alt: string; width: number; height: number; caption: string };
}

type StatusTone =
  | "match"
  | "mine"
  | "partner"
  | "off"
  | "past"
  | "booked"
  | "ok"
  | "warn"
  | "neutral"
  | "done"
  | "rowMine"
  | "rowDone";

// Gaya label disamakan dengan tampilan aslinya di halaman Jadwal Wawancara
const STATUS_TONE: Record<StatusTone, string> = {
  match: "bg-emerald-600 border-emerald-600 text-white",
  mine: "bg-[#B22234] border-[#B22234] text-white",
  partner: "bg-white dark:bg-zinc-950 border-dashed border-emerald-400 dark:border-emerald-700 text-zinc-700 dark:text-zinc-300",
  off: "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300",
  past: "bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600",
  booked: "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300",
  ok: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300",
  warn: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300",
  neutral: "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300",
  done: "bg-emerald-600 border-emerald-600 text-white",
  rowMine: "bg-[#FCF2F3] dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300",
  rowDone: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300",
};

const cardClass =
  "bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-zinc-800 rounded-xl p-5 sm:p-6 shadow-xs";

const SECTIONS: GuideSection[] = [
  {
    id: "masuk",
    title: "Masuk ke Dashboard",
    icon: LogIn,
    requires: "Semua admin yang terdaftar",
    intro: "Dashboard hanya bisa dibuka oleh email yang sudah didaftarkan superadmin di menu Role.",
    steps: [
      { title: "Buka halaman admin", detail: "Klik tombol masuk dengan akun Google." },
      {
        title: "Pilih akun Google yang terdaftar",
        detail: "Gunakan email yang didaftarkan superadmin. Email lain akan ditolak otomatis.",
      },
      {
        title: "Belum bisa masuk?",
        detail: "Hubungi superadmin (ketua umum, wakil ketua, atau developer) agar email Anda didaftarkan.",
      },
    ],
  },
  {
    id: "pendaftar",
    title: "Daftar Pendaftar",
    icon: Users,
    href: "/dashboard",
    requires: "Lihat pendaftar",
    intro: "Melihat semua calon anggota yang mendaftar beserta status pendaftaran dan hasil penilaiannya.",
    steps: [
      { title: "Buka menu Daftar Pendaftar", detail: "Tabel menampilkan semua pendaftar, urut dari yang paling awal." },
      { title: "Cari pendaftar", detail: "Ketik nama, NIM, atau kode berkas di kolom pencarian." },
      { title: "Saring hasil OPREC", detail: "Pilih filter: Diterima, Dipertimbangkan, Belum Lengkap, atau Ditolak. Klik Reset untuk menghapus filter." },
      {
        title: "Unduh PDF",
        detail: (
          <>
            Pilih divisi (atau semua divisi), lalu klik <strong>Daftar</strong> untuk daftar ringkas, atau{" "}
            <strong>Lembar Wawancara</strong> untuk pertanyaan + jawaban, satu halaman per calon anggota.
          </>
        ),
      },
      { title: "Buka detail", detail: "Klik baris pendaftar untuk melihat formulir lengkap dan CV." },
    ],
  },
  {
    id: "detail",
    title: "Detail & Penilaian Pendaftar",
    icon: UserCheck,
    requires: "Lihat pendaftar · Nilai pendaftar · Hapus pendaftar",
    intro: "Halaman detail berisi biodata, alasan memilih divisi, CV, twibbon, catatan wawancara, dan keputusan.",
    steps: [
      { title: "Periksa berkas", detail: "Buka CV (link berlaku 2 jam) dan link twibbon/portofolio." },
      {
        title: "Isi catatan wawancara",
        detail: "Pertanyaan otomatis menyesuaikan divisi pilihan 1 & 2. Tulis jawaban lalu klik Simpan Catatan.",
      },
      {
        title: "Beri keputusan",
        detail: "Pilih Diterima (beserta divisi penempatan), Ditolak, atau Pertimbangan. Butuh izin Nilai pendaftar.",
      },
      { title: "Unduh lembar wawancara", detail: "Klik Unduh PDF untuk lembar wawancara pendaftar tersebut." },
      {
        title: "Hapus pendaftar (hati-hati)",
        detail: "Menghapus data secara permanen dan tidak bisa dibatalkan. Butuh izin Hapus pendaftar.",
      },
    ],
  },
  {
    id: "pengaturan",
    title: "Pengaturan OPREC",
    icon: Sliders,
    href: "/dashboard/pengaturan",
    requires: "Pengaturan OPREC · Kelola pertanyaan wawancara",
    intro: "Mengatur kapan pendaftaran dibuka, tanggal pengumuman, dan bank pertanyaan wawancara.",
    steps: [
      { title: "Buka/tutup pendaftaran", detail: "Gunakan sakelar OPREC untuk membuka atau menutup pendaftaran saat itu juga." },
      {
        title: "Atur jadwal otomatis",
        detail: "Isi tanggal pembukaan dan penutupan. Sistem membuka/menutup pendaftaran sendiri tepat pada waktunya (WIB).",
      },
      { title: "Ubah label", detail: "Teks pengumuman yang tampil di website, mis. “Oprec Dibuka 9 - 14 November”." },
      {
        title: "Tanggal pengumuman hasil",
        detail: "Hasil seleksi baru terlihat oleh calon anggota setelah tanggal ini.",
      },
      {
        title: "Batas pemilihan jadwal wawancara",
        detail:
          "Isi tanggal & jam batas. Setelah lewat, calon anggota tidak bisa lagi memilih, mengganti, atau membatalkan jadwal; jadwal yang sudah dipilih tetap berlaku dan masih bisa di-Accept. Kosongkan untuk tanpa batas.",
      },
      {
        title: "Kelola bank pertanyaan",
        detail: "Tambah, ubah, atau hapus pertanyaan per divisi (General, Werkudara, Cakrawala, non-teknis). Butuh izin Kelola pertanyaan wawancara.",
      },
    ],
  },
  {
    id: "jadwal",
    title: "Jadwal Wawancara",
    icon: CalendarClock,
    href: "/dashboard/jadwal",
    requires: "Jadwal wawancara · Kelola semua sesi wawancara",
    intro:
      "Wawancara dilakukan berpasangan: 1 sesi = 30 menit, 1 calon anggota, 2 pewawancara. Calon anggota memilih sendiri jam yang tersedia di website.",
    steps: [
      {
        title: "Bentuk pasangan",
        detail: "Kirim undangan ke admin lain lalu tunggu diterima. Superadmin bisa langsung membentuk pasangan.",
      },
      {
        title: "Isi Data & Kalender Saya",
        detail: (
          <>
            Pilih tanggal, lalu klik slot 30 menit saat Anda <strong>bisa</strong> (klik label jam untuk memilih 2 slot
            sekaligus), lalu Simpan. Setiap anggota mengisi kalendernya sendiri.
          </>
        ),
      },
      {
        title: "Jam cocok otomatis",
        detail: (
          <>
            Slot yang <strong>sama-sama kosong</strong> bagi Anda dan pasangan berwarna hijau “Cocok ✓” dan otomatis
            bisa dipilih calon anggota. Merah = hanya Anda, garis putus = hanya pasangan.
          </>
        ),
      },
      {
        title: "Lengkapi No. WhatsApp",
        detail: "Isi nomor di panel Kelengkapan Pasangan. Nomor dipakai calon anggota untuk konfirmasi tempat via WhatsApp.",
      },
      {
        title: "Pantau Ringkasan Gabungan",
        detail: "Lihat hari & jam kosong semua pasangan, kesimpulan per pasangan, dan slot yang sudah dipesan.",
      },
      {
        title: "Catat lokasi sesi",
        detail: "Setelah tempat disepakati via WhatsApp, isi lokasi/link di Jadwal Calon Anggota. Bisa diterapkan ke semua sesi hari itu.",
      },
      {
        title: "Lakukan wawancara",
        detail: "Klik Buka Lembar Wawancara (tab baru). Isi jawaban tiap pertanyaan, lalu Simpan & Tandai Selesai.",
      },
    ],
    statuses: [
      {
        group: "Status pasangan",
        items: [
          { label: "Menunggu", tone: "warn", meaning: "Undangan sudah dikirim, belum diterima oleh admin yang diundang. Kalender belum bisa dipakai bersama." },
          { label: "Aktif", tone: "ok", meaning: "Pasangan sudah terbentuk. Jam yang sama-sama kosong bisa dipesan calon anggota." },
        ],
      },
      {
        group: "Status slot di kalender",
        items: [
          { label: "Cocok ✓", tone: "match", meaning: "Anda dan pasangan sama-sama bisa. Slot ini TERBUKA dan bisa dipilih calon anggota." },
          { label: "Bisa · pasangan belum", tone: "mine", meaning: "Hanya Anda yang bisa. Belum bisa dipesan sampai pasangan juga mengisi jam yang sama." },
          { label: "Bisa", tone: "mine", meaning: "Anda bisa, tetapi belum berpasangan. Tersimpan, tetapi belum bisa dipesan." },
          { label: "Pasangan bisa", tone: "partner", meaning: "Hanya pasangan yang bisa. Klik slot ini bila Anda juga bisa agar menjadi Cocok." },
          { label: "Tidak bisa", tone: "off", meaning: "Slot kosong, tidak ada yang mengisi." },
          { label: "Lewat", tone: "past", meaning: "Waktunya sudah lewat, tidak bisa diubah." },
          { label: "🔒 Nama calon", tone: "booked", meaning: "Sudah dipesan calon anggota. Terkunci dan tidak ikut terhapus saat kalender diubah." },
        ],
      },
      {
        group: "Status kelengkapan pasangan",
        items: [
          { label: "Siap: n sesi", tone: "ok", meaning: "Anda & pasangan sudah mengisi WhatsApp dan punya jam cocok. Calon anggota bisa memesan n sesi." },
          { label: "Belum lengkap", tone: "warn", meaning: "WhatsApp salah satu anggota belum diisi, atau belum ada jam yang cocok." },
          { label: "Belum berpasangan", tone: "warn", meaning: "Anda belum punya pasangan aktif. Kalender tersimpan tetapi belum bisa dipesan." },
        ],
      },
    ],
    image: {
      src: "/guide/tutorial-jadwal-wawancara.png",
      alt: "Tutorial bergambar halaman Jadwal Wawancara dengan 13 langkah bernomor",
      width: 2124,
      height: 1774,
      caption: "Ikuti nomor pada gambar. Klik gambar untuk membuka ukuran penuh.",
    },
    tips: [
      "Daftar sesi otomatis hanya menampilkan sesi Anda. Hapus centang “Hanya yang saya wawancarai” untuk melihat semua.",
      "Slot yang sudah dipesan calon anggota terkunci dan tidak ikut terhapus saat Anda mengubah kalender.",
      "Sesi bisa ditandai selesai kapan saja, termasuk bila wawancara dilakukan lebih awal dari jadwal (akan diminta konfirmasi).",
    ],
  },
  {
    id: "sesi",
    title: "Jadwal Calon Anggota (Saat Calon Memilih)",
    icon: ListChecks,
    href: "/dashboard/jadwal",
    requires: "Jadwal wawancara · Kelola semua sesi wawancara",
    intro:
      "Begitu calon anggota memilih jam di website, sesinya langsung muncul di daftar Jadwal Calon Anggota (bagian bawah halaman Jadwal Wawancara). Berikut alurnya dari dipilih sampai selesai.",
    steps: [
      {
        title: "Calon anggota memilih jadwal",
        detail: (
          <>
            Sesi muncul di tanggalnya dengan label <strong>Menunggu konfirmasi</strong> dan{" "}
            <strong>Lokasi belum diisi</strong>. Slot itu di kalender Anda & pasangan berubah menjadi 🔒 nama calon,
            dan di Ringkasan Gabungan tampil sebagai sudah dipesan. Calon masih bisa mengganti jadwal, sehingga sesi
            bisa berpindah jam.
          </>
        ),
      },
      {
        title: "Calon anggota menekan Accept",
        detail: (
          <>
            Label berubah menjadi <strong>🔒 Dikonfirmasi</strong>. Jam wawancara terkunci permanen dan calon tidak
            bisa menggantinya lagi.
          </>
        ),
      },
      {
        title: "Calon menghubungi via WhatsApp",
        detail:
          "Setelah Accept, calon melihat tombol WhatsApp ke Anda & pasangan untuk menyepakati tempat. Pastikan No. WhatsApp sudah diisi di Kelengkapan Pasangan.",
      },
      {
        title: "Catat lokasi",
        detail:
          "Ketik lokasi/link di kolom lokasi sesi (atau klik tombol cepat Sekretariat / Online), lalu Simpan. Centang “Terapkan ke semua sesi hari ini” bila tempatnya sama. Label Lokasi belum diisi hilang dan lokasi langsung tampil di website calon.",
      },
      {
        title: "Lakukan wawancara",
        detail:
          "Klik Buka Lembar Wawancara (tab baru). Pertanyaan sudah menyesuaikan divisi pilihan calon. Tulis jawaban & catatan khusus lalu Simpan Catatan.",
      },
      {
        title: "Tandai selesai",
        detail: (
          <>
            Centang kotak di kiri sesi, atau klik <strong>Simpan &amp; Tandai Selesai</strong> di lembar wawancara.
            Label menjadi <strong>Selesai</strong>, baris berwarna hijau, jam selesai tercatat, dan progres “x/y
            selesai” bertambah.
          </>
        ),
      },
    ],
    statuses: [
      {
        group: "Label status sesi",
        items: [
          { label: "Menunggu konfirmasi", tone: "warn", meaning: "Calon anggota sudah memilih jadwal tetapi belum menekan Accept. Ia masih bisa mengganti jadwalnya." },
          { label: "🔒 Dikonfirmasi", tone: "ok", meaning: "Calon anggota sudah Accept. Jam terkunci permanen; lokasi masih bisa diubah pewawancara." },
          { label: "Lokasi belum diisi", tone: "neutral", meaning: "Tempat belum dicatat. Calon anggota diarahkan menghubungi pewawancara via WhatsApp; isi lokasinya setelah disepakati." },
          { label: "Selesai", tone: "done", meaning: "Wawancara sudah dilakukan dan dicentang pewawancara (bisa dibatalkan bila salah centang)." },
        ],
      },
      {
        group: "Tanda pada baris sesi",
        items: [
          { label: "☐ Kotak pudar", tone: "past", meaning: "Sesi pasangan lain (hanya-baca), tidak bisa Anda centang." },
          { label: "☐ Kotak kosong", tone: "off", meaning: "Belum dicentang. Klik untuk menandai selesai; bila jam sesi belum tiba akan diminta konfirmasi." },
          { label: "✓ Kotak hijau", tone: "match", meaning: "Sudah selesai. Klik lagi untuk membatalkan bila salah centang." },
          { label: "Baris merah muda", tone: "rowMine", meaning: "Sesi yang Anda wawancarai sendiri." },
          { label: "Baris hijau", tone: "rowDone", meaning: "Sesi yang sudah selesai." },
          { label: "Lokasi: teks biasa", tone: "neutral", meaning: "Sesi milik pasangan lain: hanya bisa dilihat. Mengubahnya butuh izin Kelola semua sesi wawancara." },
        ],
      },
      {
        group: "Penghitung & filter",
        items: [
          { label: "x/y selesai", tone: "ok", meaning: "Jumlah sesi selesai dari total sesi yang tampil, dengan bilah progres hijau." },
          { label: "Hanya yang saya wawancarai", tone: "neutral", meaning: "Aktif otomatis untuk pewawancara. Hapus centang untuk melihat sesi semua pasangan." },
          { label: "Sembunyikan yang selesai", tone: "neutral", meaning: "Menyembunyikan sesi yang sudah dicentang selesai agar daftar lebih ringkas." },
        ],
      },
    ],
    image: {
      src: "/guide/contoh-sesi-calon-anggota.png",
      alt: "Contoh satu baris sesi di Jadwal Calon Anggota dengan 10 bagian bernomor dan alur status Menunggu konfirmasi, Dikonfirmasi, Selesai",
      width: 2440,
      height: 1460,
      caption: "Contoh satu baris sesi (nama & NIM adalah data contoh). Klik gambar untuk membuka ukuran penuh.",
    },
    tips: [
      "Daftar diperbarui otomatis saat Anda kembali dari tab lembar wawancara.",
      "Bila calon mengganti jadwal sebelum Accept, lokasi yang sudah dicatat ikut dikosongkan karena jamnya berubah.",
    ],
  },
  {
    id: "notifikasi",
    title: "Notifikasi Calon Anggota",
    icon: Bell,
    href: "/dashboard/notifikasi",
    requires: "Kirim pengumuman",
    intro:
      "Mengirim pengumuman yang muncul di lonceng notifikasi pada navbar website untuk semua calon anggota yang login.",
    steps: [
      { title: "Buka menu Notifikasi", detail: "Riwayat pengumuman bisa dilihat semua admin; mengirim butuh izin Kirim pengumuman." },
      {
        title: "Tulis pengumuman",
        detail: "Isi judul (3–120 karakter), isi pengumuman, dan link opsional. Cek tampilannya di Pratinjau.",
      },
      {
        title: "Kirim",
        detail: "Klik Kirim ke Semua Calon Anggota. Lonceng di website menampilkan badge merah berisi jumlah yang belum dibaca.",
      },
      {
        title: "Ubah atau hapus",
        detail: "Perbaiki salah ketik lewat Ubah (tidak memunculkan badge baru lagi), atau Hapus agar hilang dari lonceng semua calon anggota.",
      },
    ],
    tips: [
      "Badge hilang setelah calon anggota membuka lonceng.",
      "Lonceng memeriksa pengumuman baru secara otomatis tiap menit dan saat tab website dibuka kembali.",
    ],
  },
  {
    id: "role",
    title: "Role & Akses",
    icon: ShieldCheck,
    href: "/dashboard/role",
    requires: "Khusus superadmin",
    intro: "Mendaftarkan admin, membuat role, dan menentukan hak akses tiap role.",
    steps: [
      { title: "Tambah Role", detail: "Beri nama (mis. Pewawancara), deskripsi, lalu centang hak akses yang diperlukan." },
      {
        title: "Daftarkan admin",
        detail: "Masukkan email, nama, dan jabatan, lalu pilih role-nya. Admin bisa langsung masuk dengan email tersebut.",
      },
      {
        title: "Ubah atau cabut",
        detail: "Ganti role seorang admin (memasukkan email yang sudah terdaftar akan memindahkan role-nya), ubah hak akses role, atau cabut akses admin.",
      },
      {
        title: "Hapus role",
        detail: "Role hanya bisa dihapus bila tidak ada lagi admin yang memakainya. Pindahkan atau cabut akses mereka dulu.",
      },
    ],
  },
];

/** Contoh susunan role yang umum dipakai */
const ROLE_EXAMPLES: { name: string; permissions: AdminPermission[]; note: string }[] = [
  {
    name: "Viewer",
    permissions: ["viewer.readonly", "applicants.view"],
    note: "Melihat semua menu & data (termasuk pendaftar) tanpa bisa mengubah apa pun.",
  },
  {
    name: "Pewawancara",
    permissions: ["interview.schedule"],
    note: "Mengisi kalender & mengelola sesinya sendiri. Sesi pasangan lain hanya bisa dilihat.",
  },
  {
    name: "Koordinator Wawancara",
    permissions: ["applicants.view", "interview.schedule", "interview.sessions"],
    note: "Mengatur semua sesi wawancara termasuk milik pasangan lain.",
  },
  {
    name: "Penilai",
    permissions: ["applicants.view", "applicants.assess"],
    note: "Melihat berkas pendaftar dan memberi keputusan penerimaan.",
  },
  {
    name: "Panitia Inti",
    permissions: [
      "applicants.view",
      "applicants.assess",
      "oprec.settings",
      "interview.manage",
      "interview.schedule",
      "announcements.send",
    ],
    note: "Mengatur OPREC, bank pertanyaan, dan pengumuman; menilai pendaftar.",
  },
];

function PermissionMark({ on }: { on: boolean }) {
  return on ? (
    <Check className="w-4 h-4 mx-auto text-emerald-600 dark:text-emerald-400" strokeWidth={3} aria-label="Ya" />
  ) : (
    <Minus className="w-4 h-4 mx-auto text-zinc-300 dark:text-zinc-700" aria-label="Tidak" />
  );
}

export function GuidePage({ viewer }: GuidePageProps) {
  const tocItems: GuideTocItem[] = [
    ...SECTIONS.map((s) => ({ id: s.id, title: s.title })),
    { id: "hak-akses", title: "Hak Akses per Role" },
    { id: "aturan-role", title: "Aturan Perubahan Role" },
  ];

  return (
    <div className="flex-1 bg-[#F9F9F8] dark:bg-[#09090b] min-h-screen py-6 px-4 sm:px-8 transition-colors">
      <div className="max-w-6xl mx-auto xl:grid xl:grid-cols-[minmax(0,1fr)_15rem] xl:gap-6 xl:items-start">
      <div className="min-w-0 space-y-6">
        {/* Header */}
        <div className={`${cardClass} space-y-4`}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FCF2F3] dark:bg-rose-950/30 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-[#B22234] dark:text-rose-400" />
            </div>
            <div className="space-y-1">
              <h1 className="text-base sm:text-lg font-bold text-[#18181b] dark:text-zinc-100">Guide Dashboard Admin</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Panduan langkah demi langkah semua fitur dashboard OPREC Robotika UNS dan hak akses tiap role. Menu yang
                tidak sesuai hak akses Anda akan kosong atau tombolnya terkunci.
              </p>
            </div>
          </div>

          {/* Akses Anda */}
          <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Akses Anda:</span>
              <span className="text-xs font-semibold text-[#18181b] dark:text-zinc-100">{viewer.name}</span>
              {viewer.isSuperadmin ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                  <Crown className="w-3 h-3" /> Superadmin
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Role: {viewer.roleName || "Belum ada role"}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ADMIN_PERMISSIONS.map((p) => {
                const on = viewer.permissions.includes(p.key);
                return (
                  <span
                    key={p.key}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium ${
                      on
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 line-through"
                    }`}
                  >
                    {on && <Check className="w-3 h-3" strokeWidth={3} />}
                    {p.label}
                  </span>
                );
              })}
            </div>
            {!viewer.isSuperadmin && viewer.permissions.length === 0 && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Anda belum memiliki hak akses apa pun. Minta superadmin memberi Anda role.
              </p>
            )}
          </div>
        </div>

        {/* Daftar isi (HP/tablet): bar horizontal menempel di atas */}
        <GuideToc items={tocItems} variant="mobile" />

        {/* Panduan fitur */}
        {SECTIONS.map((section, index) => {
          const Icon = section.icon;
          return (
            <section key={section.id} id={section.id} className={`${cardClass} space-y-4 scroll-mt-28 xl:scroll-mt-6`}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[#B22234] dark:text-rose-400 shrink-0" />
                  <h2 className="text-sm sm:text-base font-bold text-[#18181b] dark:text-zinc-100">
                    {index + 1}. {section.title}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
                    <KeyRound className="w-3 h-3" /> {section.requires}
                  </span>
                  {section.href && (
                    <Link
                      href={section.href}
                      className="text-[11px] font-semibold text-[#B22234] dark:text-rose-400 hover:underline"
                    >
                      Buka menu →
                    </Link>
                  )}
                </div>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{section.intro}</p>

              <ol className="space-y-2.5">
                {section.steps.map((step, i) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-[#B22234] text-white text-[11px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="space-y-0.5 pt-0.5">
                      <p className="text-xs sm:text-sm font-semibold text-[#18181b] dark:text-zinc-100">{step.title}</p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>

              {section.statuses && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Arti setiap status</p>
                  {section.statuses.map((group) => (
                    <div key={group.group} className="space-y-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        {group.group}
                      </p>
                      <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                        {group.items.map((item) => (
                          <div key={item.label} className="p-2.5 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                            <span className="sm:w-48 shrink-0">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${STATUS_TONE[item.tone]}`}
                              >
                                {item.label}
                              </span>
                            </span>
                            <span className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{item.meaning}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {section.image && (
                <figure className="space-y-1.5">
                  <a
                    href={section.image.src}
                    target="_blank"
                    rel="noopener"
                    className="block rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white hover:border-[#B22234]/60 transition-colors"
                  >
                    <Image
                      src={section.image.src}
                      alt={section.image.alt}
                      width={section.image.width}
                      height={section.image.height}
                      sizes="(min-width: 1024px) 832px, 100vw"
                      className="w-full h-auto"
                    />
                  </a>
                  <figcaption className="text-[11px] text-zinc-400">{section.image.caption}</figcaption>
                </figure>
              )}

              {section.tips && (
                <ul className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400 list-disc pl-7">
                  {section.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        {/* Hak akses */}
        <section id="hak-akses" className={`${cardClass} space-y-4 scroll-mt-28 xl:scroll-mt-6`}>
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#B22234] dark:text-rose-400" />
            <h2 className="text-sm sm:text-base font-bold text-[#18181b] dark:text-zinc-100">
              {SECTIONS.length + 1}. Hak Akses per Role
            </h2>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Setiap role berisi kumpulan hak akses di bawah. Satu admin hanya memiliki satu role. Superadmin otomatis
            memiliki semua hak akses tanpa perlu role.
          </p>

          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            {ADMIN_PERMISSIONS.map((p) => (
              <div key={p.key} className="p-3 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                <span className="sm:w-52 shrink-0 text-xs font-semibold text-[#18181b] dark:text-zinc-100">{p.label}</span>
                <span className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{p.description}</span>
              </div>
            ))}
          </div>

          <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 pt-1">Contoh susunan role</p>
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full min-w-[760px] text-[11px] border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
              <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-zinc-600 dark:text-zinc-400">
                <tr>
                  <th className="text-left font-semibold p-2.5">Role</th>
                  {ADMIN_PERMISSIONS.map((p) => (
                    <th key={p.key} className="font-semibold p-2 text-center leading-tight">
                      {p.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                <tr className="bg-amber-50/50 dark:bg-amber-950/10">
                  <td className="p-2.5">
                    <span className="inline-flex items-center gap-1 font-semibold text-[#18181b] dark:text-zinc-100">
                      <Crown className="w-3 h-3 text-amber-600" /> Superadmin
                    </span>
                    <span className="block text-zinc-500 dark:text-zinc-400">Ketua umum, wakil ketua, developer</span>
                  </td>
                  {ADMIN_PERMISSIONS.map((p) => (
                    <td key={p.key} className="p-2">
                      <PermissionMark on={p.key !== "viewer.readonly"} />
                    </td>
                  ))}
                </tr>
                {ROLE_EXAMPLES.map((role) => (
                  <tr key={role.name}>
                    <td className="p-2.5">
                      <span className="font-semibold text-[#18181b] dark:text-zinc-100">{role.name}</span>
                      <span className="block text-zinc-500 dark:text-zinc-400">{role.note}</span>
                    </td>
                    {ADMIN_PERMISSIONS.map((p) => (
                      <td key={p.key} className="p-2">
                        <PermissionMark on={role.permissions.includes(p.key)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-zinc-400">
            Ini hanya contoh. Nama dan isi role bebas disusun superadmin di menu Role sesuai kebutuhan kepanitiaan.
          </p>
        </section>

        {/* Aturan perubahan role */}
        <section
          id="aturan-role"
          className="scroll-mt-28 xl:scroll-mt-6 rounded-xl p-5 sm:p-6 border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 space-y-3"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            <h2 className="text-sm sm:text-base font-bold text-amber-900 dark:text-amber-200">
              {SECTIONS.length + 2}. Aturan Perubahan Role: Hanya Superadmin
            </h2>
          </div>
          <ul className="space-y-2 text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
            {[
              <>
                <strong>Hanya superadmin</strong> (ketua umum, wakil ketua, developer) yang dapat membuka menu Role,
                membuat/mengubah/menghapus role, mendaftarkan admin baru, serta mengganti atau mencabut role seseorang.
              </>,
              <>
                Admin lain <strong>tidak dapat</strong> mengubah role-nya sendiri maupun role orang lain. Menu Role tidak
                muncul di sidebar mereka, dan perubahan tetap ditolak oleh database bila dicoba lewat cara lain.
              </>,
              <>
                Status <strong>superadmin tidak bisa diberikan dari dashboard</strong>. Status ini hanya diatur langsung
                di database oleh developer.
              </>,
              <>Akun superadmin tidak dapat diubah atau dihapus dari dashboard.</>,
              <>
                Butuh akses tambahan? <strong>Hubungi superadmin</strong> dan sebutkan hak akses yang diperlukan beserta
                alasannya.
              </>,
            ].map((item, i) => (
              <li key={i} className="flex gap-2">
                <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Daftar isi (PC): kolom kanan menempel mengikuti scroll */}
      <GuideToc items={tocItems} variant="desktop" />
      </div>
    </div>
  );
}
