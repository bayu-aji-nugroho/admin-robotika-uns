// Daftar hak akses yang bisa diberikan ke custom role.
// Harus sama dengan constraint admin_roles_permissions_known di database.
export const VIEWER_PERMISSION = "viewer.readonly" as const;

export const ADMIN_PERMISSIONS = [
  {
    key: "viewer.readonly",
    label: "Viewer (hanya lihat)",
    description:
      "Bisa membuka semua menu dan melihat semua data, tetapi tidak dapat mengubah apa pun. Tidak bisa digabung dengan hak akses lain.",
  },
  {
    key: "applicants.view",
    label: "Lihat pendaftar",
    description: "Melihat daftar, detail, CV pendaftar, dan halaman Statistik.",
  },
  {
    key: "applicants.assess",
    label: "Nilai pendaftar",
    description: "Mengubah keputusan penerimaan dan divisi penempatan.",
  },
  {
    key: "applicants.delete",
    label: "Hapus pendaftar",
    description: "Menghapus data pendaftar secara permanen.",
  },
  {
    key: "oprec.settings",
    label: "Pengaturan OPREC",
    description:
      "Membuka/menutup pendaftaran, jadwal buka-tutup, label, tanggal pengumuman, batas pemilihan jadwal wawancara, dan pengecualian login SSO.",
  },
  {
    key: "interview.manage",
    label: "Kelola pertanyaan wawancara",
    description: "Menambah, mengubah, dan menghapus bank pertanyaan wawancara.",
  },
  {
    key: "interview.schedule",
    label: "Jadwal wawancara",
    description:
      "Mengisi kalender sebagai pewawancara dan mengelola sesi miliknya sendiri (lokasi, selesai, lembar wawancara). Sesi pasangan lain hanya bisa dilihat.",
  },
  {
    key: "announcements.send",
    label: "Kirim pengumuman",
    description:
      "Mengirim, mengubah, dan menghapus notifikasi pengumuman yang muncul di lonceng website calon anggota.",
  },
  {
    key: "interview.sessions",
    label: "Kelola semua sesi wawancara",
    description:
      "Mengubah lokasi, tanda selesai, dan lembar wawancara di semua sesi, termasuk milik pasangan lain.",
  },
  {
    key: "events.manage",
    label: "Kelola acara divisi",
    description:
      "Menambahkan acara divisi, menyiapkan data tiket QR calon anggota, dan memindai QR Code kehadiran.",
  },
  {
    key: "roles.assign_limited",
    label: "Tambah admin (role terbatas)",
    description:
      "Menambah & mencabut admin di menu Role, tetapi hanya dengan role yang ditandai superadmin “boleh diberikan” (mis. Teacher Magang). Tidak bisa membuat/mengubah role atau menyentuh superadmin.",
  },
  {
    key: "grades.manage",
    label: "Nilai magang",
    description:
      "Menambah item penilaian serta mengisi nilai & catatan calon anggota di tab Penilaian, tanpa bisa mengubah keputusan penerimaan.",
  },
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number]["key"];

export const ADMIN_PERMISSION_KEYS: AdminPermission[] = ADMIN_PERMISSIONS.map(
  (p) => p.key
);

export function isAdminPermission(value: string): value is AdminPermission {
  return (ADMIN_PERMISSION_KEYS as string[]).includes(value);
}
