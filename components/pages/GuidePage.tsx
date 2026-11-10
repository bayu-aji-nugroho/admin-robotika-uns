import React from "react";
import Link from "next/link";
import {
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
}

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
    tips: [
      "Daftar sesi otomatis hanya menampilkan sesi Anda. Hapus centang “Hanya yang saya wawancarai” untuk melihat semua.",
      "Slot yang sudah dipesan calon anggota terkunci dan tidak ikut terhapus saat Anda mengubah kalender.",
      "Sesi hanya bisa ditandai selesai setelah jam mulainya lewat.",
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
    permissions: ["applicants.view", "applicants.assess", "oprec.settings", "interview.manage", "interview.schedule"],
    note: "Mengatur OPREC dan bank pertanyaan, menilai pendaftar.",
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
  return (
    <div className="flex-1 bg-[#F9F9F8] dark:bg-[#09090b] min-h-screen py-6 px-4 sm:px-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-6">
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

          {/* Daftar isi */}
          <nav aria-label="Daftar isi" className="flex flex-wrap gap-1.5">
            {[...SECTIONS.map((s) => ({ id: s.id, title: s.title })), { id: "hak-akses", title: "Hak Akses per Role" }, { id: "aturan-role", title: "Aturan Perubahan Role" }].map(
              (item, i) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:border-[#B22234]/60 hover:text-[#B22234] dark:hover:text-rose-400 transition-colors"
                >
                  {i + 1}. {item.title}
                </a>
              )
            )}
          </nav>
        </div>

        {/* Panduan fitur */}
        {SECTIONS.map((section, index) => {
          const Icon = section.icon;
          return (
            <section key={section.id} id={section.id} className={`${cardClass} space-y-4 scroll-mt-6`}>
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
        <section id="hak-akses" className={`${cardClass} space-y-4 scroll-mt-6`}>
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
            <table className="w-full min-w-[640px] text-[11px] border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
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
                      <PermissionMark on />
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
          className="scroll-mt-6 rounded-xl p-5 sm:p-6 border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 space-y-3"
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
    </div>
  );
}
