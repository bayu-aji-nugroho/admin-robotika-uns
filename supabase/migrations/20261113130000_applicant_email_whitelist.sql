-- Pengecualian login calon anggota: email non-SSO (mis. Gmail pribadi) yang didaftarkan admin
-- boleh login & mendaftar, khusus untuk yang akun SSO @student.uns.ac.id-nya bermasalah.
-- Selain email di daftar ini tetap wajib SSO. Dikelola admin dengan izin 'oprec.settings'.

CREATE TABLE IF NOT EXISTS public.applicant_email_whitelist (
  email text PRIMARY KEY CHECK (email = lower(btrim(email)) AND email LIKE '%_@_%.__%'),
  note text CHECK (note IS NULL OR char_length(note) <= 200),
  created_by uuid REFERENCES public.admin_whitelist(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.applicant_email_whitelist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin oprec membaca whitelist email" ON public.applicant_email_whitelist;
CREATE POLICY "Admin oprec membaca whitelist email" ON public.applicant_email_whitelist
  FOR SELECT TO authenticated
  USING (public.has_admin_permission('oprec.settings') OR public.has_admin_permission('viewer.readonly'));

-- true bila email boleh dipakai calon anggota: SSO mahasiswa UNS atau ada di whitelist
CREATE OR REPLACE FUNCTION public.is_applicant_email_allowed(p_email text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(lower(btrim(p_email)), '') LIKE '%@student.uns.ac.id'
      OR EXISTS (SELECT 1 FROM public.applicant_email_whitelist w WHERE w.email = lower(btrim(p_email)));
$$;
REVOKE ALL ON FUNCTION public.is_applicant_email_allowed(text) FROM public;

-- Dipanggil website: apakah akun yang sedang login boleh dipakai mendaftar
CREATE OR REPLACE FUNCTION public.am_i_allowed_applicant()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_applicant_email_allowed(auth.jwt() ->> 'email');
$$;
REVOKE ALL ON FUNCTION public.am_i_allowed_applicant() FROM public;
GRANT EXECUTE ON FUNCTION public.am_i_allowed_applicant() TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_applicant_sso_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text;
BEGIN
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = NEW.user_id;

  IF v_email IS NULL OR NOT public.is_applicant_email_allowed(v_email) THEN
    RAISE EXCEPTION 'Pendaftaran hanya dapat menggunakan email SSO mahasiswa UNS (@student.uns.ac.id). Silakan logout lalu masuk dengan akun SSO Anda.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_applicant_email_whitelist(p_email text, p_note text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
BEGIN
  IF NOT public.has_admin_permission('oprec.settings') THEN
    RAISE EXCEPTION 'Akses ditolak: Role Anda tidak memiliki hak Pengaturan OPREC.';
  END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' THEN
    RAISE EXCEPTION 'Format email tidak valid.';
  END IF;
  IF v_email LIKE '%@student.uns.ac.id' THEN
    RAISE EXCEPTION 'Email SSO @student.uns.ac.id sudah otomatis diizinkan, tidak perlu di-whitelist.';
  END IF;
  IF v_note IS NOT NULL AND char_length(v_note) > 200 THEN
    RAISE EXCEPTION 'Catatan maksimal 200 karakter.';
  END IF;

  INSERT INTO public.applicant_email_whitelist (email, note, created_by)
  VALUES (v_email, v_note, public.current_admin_id())
  ON CONFLICT (email) DO UPDATE SET note = EXCLUDED.note;

  RETURN v_email;
END;
$$;
REVOKE ALL ON FUNCTION public.add_applicant_email_whitelist(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.add_applicant_email_whitelist(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_applicant_email_whitelist(p_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_admin_permission('oprec.settings') THEN
    RAISE EXCEPTION 'Akses ditolak: Role Anda tidak memiliki hak Pengaturan OPREC.';
  END IF;
  DELETE FROM public.applicant_email_whitelist WHERE email = lower(btrim(coalesce(p_email, '')));
END;
$$;
REVOKE ALL ON FUNCTION public.remove_applicant_email_whitelist(text) FROM public;
GRANT EXECUTE ON FUNCTION public.remove_applicant_email_whitelist(text) TO authenticated;

-- Daftar pengecualian untuk halaman Pengaturan OPREC, beserta status login & pendaftarannya
CREATE OR REPLACE FUNCTION public.list_applicant_email_whitelist()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_admin_permission('oprec.settings') OR public.has_admin_permission('viewer.readonly')) THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'email', w.email,
      'note', w.note,
      'created_at', w.created_at,
      'has_account', u.id IS NOT NULL,
      'applicant_name', a.full_name
    ) ORDER BY w.created_at DESC)
    FROM public.applicant_email_whitelist w
    LEFT JOIN auth.users u ON lower(u.email) = w.email
    LEFT JOIN public.applicants a ON a.user_id = u.id
  ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.list_applicant_email_whitelist() FROM public;
GRANT EXECUTE ON FUNCTION public.list_applicant_email_whitelist() TO authenticated;
