-- ==============================================================================
-- Migration: Admin View and RLS Policies for Applicants
-- Deskripsi: 
-- 1. Menyediakan view backward-compatibility public.registrations -> public.view_registrations
-- 2. Mengizinkan admin aktif di admin_whitelist untuk SELECT, UPDATE, DELETE tabel applicants
-- 3. Mengizinkan admin aktif untuk SELECT dan DELETE tabel applicant_divisions
-- 4. Memperbarui RLS assessments agar case-insensitive
-- 5. Mengizinkan admin aktif untuk DELETE berkas di storage bucket cv-uploads
-- ==============================================================================

-- 1. Backward-compatible view
CREATE OR REPLACE VIEW public.registrations WITH (security_invoker = true) AS
SELECT * FROM public.view_registrations;

GRANT SELECT ON public.registrations TO authenticated, anon;

-- 2. RLS policies on public.applicants for admins
DROP POLICY IF EXISTS "applicants_admin_select" ON public.applicants;
CREATE POLICY "applicants_admin_select" ON public.applicants
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_whitelist aw
    WHERE lower(aw.email) = lower(coalesce((select auth.jwt())->>'email', ''))
      AND aw.is_active = true
  )
);

DROP POLICY IF EXISTS "applicants_admin_update" ON public.applicants;
CREATE POLICY "applicants_admin_update" ON public.applicants
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_whitelist aw
    WHERE lower(aw.email) = lower(coalesce((select auth.jwt())->>'email', ''))
      AND aw.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_whitelist aw
    WHERE lower(aw.email) = lower(coalesce((select auth.jwt())->>'email', ''))
      AND aw.is_active = true
  )
);

DROP POLICY IF EXISTS "applicants_admin_delete" ON public.applicants;
CREATE POLICY "applicants_admin_delete" ON public.applicants
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_whitelist aw
    WHERE lower(aw.email) = lower(coalesce((select auth.jwt())->>'email', ''))
      AND aw.is_active = true
  )
);

-- 3. RLS policies on public.applicant_divisions for admins
DROP POLICY IF EXISTS "applicant_divisions_admin_select" ON public.applicant_divisions;
CREATE POLICY "applicant_divisions_admin_select" ON public.applicant_divisions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_whitelist aw
    WHERE lower(aw.email) = lower(coalesce((select auth.jwt())->>'email', ''))
      AND aw.is_active = true
  )
);

DROP POLICY IF EXISTS "applicant_divisions_admin_delete" ON public.applicant_divisions;
CREATE POLICY "applicant_divisions_admin_delete" ON public.applicant_divisions
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_whitelist aw
    WHERE lower(aw.email) = lower(coalesce((select auth.jwt())->>'email', ''))
      AND aw.is_active = true
  )
);

-- 4. assessments policy case-insensitivity
DROP POLICY IF EXISTS "assessments_admin_full_access" ON public.assessments;
CREATE POLICY "assessments_admin_full_access" ON public.assessments
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_whitelist aw
    WHERE lower(aw.email) = lower(coalesce((select auth.jwt())->>'email', ''))
      AND aw.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_whitelist aw
    WHERE lower(aw.email) = lower(coalesce((select auth.jwt())->>'email', ''))
      AND aw.is_active = true
  )
);

-- 5. Storage delete policy for admin
DROP POLICY IF EXISTS "admin_whitelist_delete_cv_storage" ON storage.objects;
CREATE POLICY "admin_whitelist_delete_cv_storage" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'cv-uploads'
  AND EXISTS (
    SELECT 1 FROM public.admin_whitelist aw
    WHERE lower(aw.email) = lower(coalesce((select auth.jwt())->>'email', ''))
      AND aw.is_active = true
  )
);

