-- ==============================================================================
-- Migration: Allow active authenticated admins to select/download cv files
-- Deskripsi: Memberikan hak SELECT pada storage.objects untuk bucket 'cv-uploads'
--            hanya untuk user authenticated yang email-nya terdaftar
--            dan aktif (is_active = true) pada public.admin_whitelist.
-- ==============================================================================

DROP POLICY IF EXISTS "admin_whitelist_select_cv_storage" ON storage.objects;

CREATE POLICY "admin_whitelist_select_cv_storage" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'cv-uploads'
  AND EXISTS (
    SELECT 1 FROM public.admin_whitelist
    WHERE lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
      AND is_active = true
  )
);
