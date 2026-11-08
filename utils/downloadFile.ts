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
      return body?.error || "Gagal mengunduh file.";
    }

    const disposition = res.headers.get("Content-Disposition") || "";
    const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] || fallbackName;
    const objectUrl = URL.createObjectURL(await res.blob());
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    return null;
  } catch {
    return "Gagal mengunduh file. Periksa koneksi Anda.";
  }
}
