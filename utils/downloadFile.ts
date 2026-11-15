"use client";

/**
 * Mengunduh file dari route API lewat fetch agar pesan error JSON
 * (mis. akses ditolak) bisa ditampilkan, bukan ikut terunduh sebagai file.
 * Mengembalikan pesan error, atau null bila berhasil.
 */
export async function downloadFromApi(url: string, fallbackName: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      if (body?.error) return body.error;
      // Respons non-JSON (mis. halaman error platform saat waktu habis)
      if (res.status === 504 || res.status === 408) {
        return "Pembuatan PDF terlalu lama. Coba lagi, atau persempit filternya (mis. per divisi).";
      }
      if (res.status === 401) return "Sesi berakhir. Muat ulang halaman lalu login kembali.";
      return `Gagal mengunduh file (kode ${res.status}). Coba lagi.`;
    }

    const blob = await res.blob();
    if (blob.size === 0) return "File PDF kosong. Coba lagi.";

    const disposition = res.headers.get("Content-Disposition") || "";
    const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] || fallbackName;
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Jangan langsung dicabut: sebagian browser (Safari/Firefox/HP) membatalkan unduhan
    // bila URL dicabut sebelum file selesai disimpan.
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return null;
  } catch {
    return "Gagal mengunduh file. Periksa koneksi Anda lalu coba lagi.";
  }
}
