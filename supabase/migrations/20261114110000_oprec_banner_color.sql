-- Warna notifikasi "Open Recruitment dibuka" yang muncul di landing page.
-- Diatur di Pengaturan OPREC. NULL = warna bawaan (hijau).

ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS oprec_banner_color text;

ALTER TABLE public.admin_settings DROP CONSTRAINT IF EXISTS admin_settings_oprec_banner_color_hex;
ALTER TABLE public.admin_settings ADD CONSTRAINT admin_settings_oprec_banner_color_hex
  CHECK (oprec_banner_color IS NULL OR oprec_banner_color ~ '^#[0-9a-f]{6}$');
