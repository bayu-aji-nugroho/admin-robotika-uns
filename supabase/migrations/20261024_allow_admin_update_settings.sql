-- ==============================================================================
-- Migration: Allow active authenticated admins to update admin_settings
-- Deskripsi: Memberikan hak UPDATE pada tabel public.admin_settings
--            hanya untuk user authenticated yang email-nya terdaftar
--            dan aktif (is_active = true) pada public.admin_whitelist.
-- ==============================================================================

-- 1. Buat policy UPDATE untuk admin
DROP POLICY IF EXISTS "admin_settings_update_admins" ON public.admin_settings;

CREATE POLICY "admin_settings_update_admins" ON public.admin_settings
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_whitelist
    WHERE lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
      AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_whitelist
    WHERE lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
      AND is_active = true
  )
);

-- 2. Pastikan trigger auto-update updated_at tersedia jika diperlukan
CREATE OR REPLACE FUNCTION public.handle_admin_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_admin_settings_updated_at ON public.admin_settings;

CREATE TRIGGER tr_admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_admin_settings_updated_at();
