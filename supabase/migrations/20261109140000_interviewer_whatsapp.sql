-- No. WhatsApp pewawancara untuk konfirmasi wawancara.
-- * Disimpan per admin (sekali isi, berlaku untuk semua jadwal), format 62xxxxxxxxxx.
-- * Terlihat oleh sesama admin (panel Kelengkapan di dashboard) dan oleh calon anggota
--   HANYA untuk pewawancara pada booking miliknya sendiri (get_my_interview_booking).

ALTER TABLE public.admin_whitelist
  ADD COLUMN IF NOT EXISTS interview_whatsapp text;

ALTER TABLE public.admin_whitelist
  DROP CONSTRAINT IF EXISTS admin_whitelist_interview_whatsapp_format;
ALTER TABLE public.admin_whitelist
  ADD CONSTRAINT admin_whitelist_interview_whatsapp_format CHECK (
    interview_whatsapp IS NULL OR interview_whatsapp ~ '^62[0-9]{8,13}$'
  );

-- Simpan/hapus No. WhatsApp. Input bebas (0812-..., +62 812 ..., 62812...), dinormalisasi ke 62xxx.
-- p_admin = NULL untuk diri sendiri; superadmin boleh mengisi milik admin lain.
CREATE OR REPLACE FUNCTION public.set_interview_whatsapp(p_phone text, p_admin uuid DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := public.current_admin_id();
  v_target uuid;
  v_digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  v_target := coalesce(p_admin, v_me);
  IF v_target <> v_me AND NOT public.is_admin_superuser() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya superadmin yang dapat mengubah nomor admin lain.';
  END IF;

  IF v_digits = '' THEN
    v_digits := NULL;
  ELSIF v_digits LIKE '0%' THEN
    v_digits := '62' || substr(v_digits, 2);
  ELSIF v_digits LIKE '8%' THEN
    v_digits := '62' || v_digits;
  END IF;

  IF v_digits IS NOT NULL AND v_digits !~ '^62[0-9]{8,13}$' THEN
    RAISE EXCEPTION 'Nomor WhatsApp tidak valid. Gunakan format 08xx atau 62xx.';
  END IF;

  UPDATE public.admin_whitelist
  SET interview_whatsapp = v_digits, updated_at = timezone('utc'::text, now())
  WHERE id = v_target;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Admin tidak ditemukan.';
  END IF;

  RETURN v_digits;
END;
$$;

REVOKE ALL ON FUNCTION public.set_interview_whatsapp(text, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_interview_whatsapp(text, uuid) TO authenticated;

-- Booking calon anggota: tambah kontak pewawancara (nama + WhatsApp).
-- Field 'interviewers' (array nama) dipertahankan untuk kompatibilitas.
CREATE OR REPLACE FUNCTION public.get_my_interview_booking()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_applicant uuid := public.current_submitted_applicant_id();
  v_result jsonb;
BEGIN
  IF v_applicant IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', b.id,
    'start_at', b.start_at,
    'location', b.location,
    'status', b.status,
    'accepted_at', b.accepted_at,
    'interviewers', coalesce((
      SELECT jsonb_agg(public.admin_display_name(x.admin_id) ORDER BY x.ord)
      FROM unnest(b.interviewer_ids) WITH ORDINALITY AS x(admin_id, ord)
    ), '[]'::jsonb),
    'interviewer_contacts', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'name', public.admin_display_name(x.admin_id),
          'whatsapp', w.interview_whatsapp
        ) ORDER BY x.ord
      )
      FROM unnest(b.interviewer_ids) WITH ORDINALITY AS x(admin_id, ord)
      LEFT JOIN public.admin_whitelist w ON w.id = x.admin_id
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM public.interview_bookings b
  WHERE b.applicant_id = v_applicant;

  RETURN v_result;
END;
$$;
