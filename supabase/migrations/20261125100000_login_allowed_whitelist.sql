-- Email di whitelist pendaftar (Pengaturan admin) tetap boleh login walau OPREC ditutup,
-- mis. akun panitia untuk uji coba. Pengiriman pendaftaran tetap ditolak database saat tutup.
CREATE OR REPLACE FUNCTION public.am_i_login_allowed()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT coalesce((
      SELECT public.oprec_open_from_schedule(s.is_oprec, s.oprec_open_at, s.oprec_close_at)
      FROM public.admin_settings s WHERE s.id = 1
    ), false)
    OR EXISTS (
      SELECT 1 FROM public.applicants a
      WHERE a.user_id = auth.uid() AND a.status = 'submitted'
    )
    OR EXISTS (
      SELECT 1 FROM public.applicant_email_whitelist w
      WHERE w.email = lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
    );
$$;

REVOKE ALL ON FUNCTION public.am_i_login_allowed() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.am_i_login_allowed() TO authenticated;
