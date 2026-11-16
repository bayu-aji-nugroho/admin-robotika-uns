/** Aturan berkas CV, disamakan dengan validasi unggah di website pendaftaran. */
export const CV_MAX_BYTES = 1048576; // 1 MB, sama dengan batas bucket cv-uploads

const FORBIDDEN_EXTENSIONS = new Set([
  "exe", "dll", "bat", "cmd", "scr", "pif", "vbs", "js", "ps1", "sh", "bin", "hta", "msi", "cpl", "com", "jar",
]);

/** Validasi nama & ukuran berkas (dipakai di browser dan server). null = valid. */
export function validateCvMeta(name: string, size: number): string | null {
  const fileName = (name || "").trim();
  if (!fileName) return "Nama berkas tidak valid.";
  if (/[\x00-\x1F\x7F]/.test(fileName) || fileName.includes("%00") || fileName.includes("..")) {
    return "Nama berkas mengandung karakter terlarang.";
  }
  if (/[‪-‮⁦-⁩]/.test(fileName)) {
    return "Nama berkas mengandung karakter penyamar ekstensi.";
  }
  const lower = fileName.toLowerCase();
  if (!lower.endsWith(".pdf")) return "Berkas CV wajib berformat PDF (.pdf).";
  const parts = lower.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    if (FORBIDDEN_EXTENSIONS.has(parts[i].trim())) {
      return `Terdeteksi ekstensi berbahaya tersembunyi (".${parts[i]}").`;
    }
  }
  if (size <= 0) return "Berkas CV kosong.";
  if (size > CV_MAX_BYTES) {
    return `Ukuran berkas melebihi 1 MB (terdeteksi ${(size / CV_MAX_BYTES).toFixed(2)} MB).`;
  }
  return null;
}

/** Cek magic bytes "%PDF-" di awal berkas. */
export function hasPdfSignature(buffer: ArrayBuffer): boolean {
  const head = new Uint8Array(buffer.slice(0, 5));
  return head.length === 5 && String.fromCharCode(...head) === "%PDF-";
}
