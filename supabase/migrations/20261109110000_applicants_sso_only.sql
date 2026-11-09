-- Pendaftaran calon anggota hanya untuk email SSO mahasiswa UNS (@student.uns.ac.id).
-- Dibatasi di tabel applicants (bukan di auth.users) karena project Supabase yang sama
-- juga dipakai login dashboard admin, dan sebagian admin memakai akun Gmail.

CREATE OR REPLACE FUNCTION public.enforce_applicant_sso_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = NEW.user_id;

  IF v_email IS NULL OR v_email NOT LIKE '%@student.uns.ac.id' THEN
    RAISE EXCEPTION 'Pendaftaran hanya dapat menggunakan email SSO mahasiswa UNS (@student.uns.ac.id). Silakan logout lalu masuk dengan akun SSO Anda.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_applicants_sso_email ON public.applicants;
CREATE TRIGGER trg_applicants_sso_email
  BEFORE INSERT OR UPDATE OF user_id ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.enforce_applicant_sso_email();
