// Warna notifikasi "Open Recruitment dibuka" di landing page.
// Logika teks kontras harus sama dengan website (src/services/admin/adminSettings.service.ts).

/** Warna bawaan (hijau) bila admin belum memilih warna */
export const DEFAULT_BANNER_COLOR = "#059669";

export const BANNER_COLOR_PRESETS: { label: string; value: string }[] = [
  { label: "Hijau (bawaan)", value: "#059669" },
  { label: "Merah Robotika", value: "#b22234" },
  { label: "Biru", value: "#2563eb" },
  { label: "Oranye", value: "#ea580c" },
  { label: "Ungu", value: "#7c3aed" },
  { label: "Hitam", value: "#18181b" },
];

export function isValidBannerColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Rasio kontras minimum teks putih (teks tebal) sebelum beralih ke teks hitam */
export const MIN_WHITE_TEXT_CONTRAST = 3;

/**
 * Warna teks di atas warna latar beserta rasio kontrasnya. Putih diutamakan (sesuai desain asli)
 * selama kontrasnya >= 3:1; bila latar terlalu terang, pakai teks hitam.
 */
export function bannerTextColor(bg: string): { color: string; ratio: number } {
  const white = contrast(bg, "#ffffff");
  if (white >= MIN_WHITE_TEXT_CONTRAST) return { color: "#ffffff", ratio: white };
  return { color: "#18181b", ratio: contrast(bg, "#18181b") };
}
