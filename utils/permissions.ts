// Daftar hak akses yang bisa diberikan ke custom role.
// Harus sama dengan constraint admin_roles_permissions_known di database.
export const ADMIN_PERMISSIONS = [
  {
    key: "applicants.view",
    label: "Lihat pendaftar",
    description: "Melihat daftar, detail, dan CV pendaftar.",
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
    description: "Membuka/menutup pendaftaran dan mengubah label pengumuman.",
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
    key: "interview.sessions",
    label: "Kelola semua sesi wawancara",
    description:
      "Mengubah lokasi, tanda selesai, dan lembar wawancara di semua sesi, termasuk milik pasangan lain.",
  },
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number]["key"];

export const ADMIN_PERMISSION_KEYS: AdminPermission[] = ADMIN_PERMISSIONS.map(
  (p) => p.key
);

export function isAdminPermission(value: string): value is AdminPermission {
  return (ADMIN_PERMISSION_KEYS as string[]).includes(value);
}
