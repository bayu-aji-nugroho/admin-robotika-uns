-- Tanggal pengumuman hasil seleksi.
-- * admin_settings.announcement_at: kapan hasil seleksi boleh dilihat calon anggota.
--   NULL = belum ditentukan (hasil disembunyikan).
-- * Calon anggota hanya bisa membaca baris assessments miliknya setelah
--   waktu pengumuman tiba, sehingga hasil tidak bocor walau API dipanggil langsung.
--   Akses admin ke assessments tidak berubah.

ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS announcement_at timestamptz;

CREATE OR REPLACE FUNCTION public.is_announcement_open()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((SELECT announcement_at <= now() FROM public.admin_settings WHERE id = 1), false);
$$;

REVOKE ALL ON FUNCTION public.is_announcement_open() FROM public;
GRANT EXECUTE ON FUNCTION public.is_announcement_open() TO anon, authenticated;

DROP POLICY IF EXISTS assessments_user_read_own ON public.assessments;
CREATE POLICY assessments_user_read_own ON public.assessments
  FOR SELECT TO authenticated
  USING (
    public.is_announcement_open()
    AND EXISTS (
      SELECT 1 FROM public.applicants a
      WHERE a.id = assessments.applicant_id AND a.user_id = auth.uid()
    )
  );
