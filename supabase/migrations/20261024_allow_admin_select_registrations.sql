-- ==============================================================================
-- Migration: Allow active authenticated admins to select registrations
-- Deskripsi: Memberikan hak SELECT pada tabel public.registrations
--            hanya untuk user authenticated yang email-nya terdaftar
--            dan aktif (is_active = true) pada public.admin_whitelist.
-- ==============================================================================

DROP POLICY IF EXISTS "registrations_admin_select" ON public.registrations;

CREATE POLICY "registrations_admin_select" ON public.registrations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_whitelist
    WHERE lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
      AND is_active = true
  )
);
