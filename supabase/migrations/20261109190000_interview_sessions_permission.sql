-- Izin baru 'interview.sessions' (Kelola semua sesi wawancara):
-- mengisi lokasi, menandai selesai, membaca & mengisi lembar wawancara di SEMUA sesi.
-- Tanpa izin ini (mis. role Pewawancara dengan 'interview.schedule'), admin hanya dapat
-- mengubah sesi miliknya sendiri; sesi pasangan lain tetap terlihat tetapi hanya-baca.
-- Superadmin otomatis memiliki semua izin (has_admin_permission).

ALTER TABLE public.admin_roles DROP CONSTRAINT IF EXISTS admin_roles_permissions_known;
ALTER TABLE public.admin_roles ADD CONSTRAINT admin_roles_permissions_known CHECK (
  permissions <@ ARRAY[
    'applicants.view', 'applicants.assess', 'applicants.delete', 'oprec.settings',
    'interview.manage', 'interview.schedule', 'interview.sessions'
  ]::text[]
);

CREATE OR REPLACE FUNCTION public.set_booking_location(
  p_booking uuid,
  p_location text,
  p_apply_same_day boolean DEFAULT false
)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := public.current_admin_id();
  v_booking public.interview_bookings%ROWTYPE;
  v_location text := nullif(btrim(coalesce(p_location, '')), '');
  v_count int;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  SELECT * INTO v_booking FROM public.interview_bookings WHERE id = p_booking;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesi wawancara tidak ditemukan.';
  END IF;

  IF NOT (v_me = ANY (v_booking.interviewer_ids)) AND NOT public.has_admin_permission('interview.sessions') THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya pewawancara sesi ini atau pengelola sesi wawancara yang dapat mencatat lokasi.';
  END IF;

  IF v_location IS NOT NULL AND char_length(v_location) > 300 THEN
    RAISE EXCEPTION 'Lokasi/link maksimal 300 karakter.';
  END IF;

  UPDATE public.interview_bookings b
  SET location = v_location, updated_at = timezone('utc'::text, now())
  WHERE b.id = v_booking.id
     OR (
       p_apply_same_day
       AND v_booking.pair_id IS NOT NULL
       AND b.pair_id = v_booking.pair_id
       AND (b.start_at AT TIME ZONE 'Asia/Jakarta')::date = (v_booking.start_at AT TIME ZONE 'Asia/Jakarta')::date
     );
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_interview_completed(p_booking uuid, p_done boolean)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := public.current_admin_id();
  v_booking public.interview_bookings%ROWTYPE;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  SELECT * INTO v_booking FROM public.interview_bookings WHERE id = p_booking;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesi wawancara tidak ditemukan.';
  END IF;

  IF NOT (v_me = ANY (v_booking.interviewer_ids)) AND NOT public.has_admin_permission('interview.sessions') THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya pewawancara sesi ini atau pengelola sesi wawancara yang dapat menandai selesai.';
  END IF;

  IF p_done AND v_booking.start_at > now() THEN
    RAISE EXCEPTION 'Sesi belum dimulai, belum bisa ditandai selesai.';
  END IF;

  UPDATE public.interview_bookings
  SET completed_at = CASE WHEN p_done THEN timezone('utc'::text, now()) ELSE NULL END,
      completed_by = CASE WHEN p_done THEN v_me ELSE NULL END,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_booking;

  RETURN CASE WHEN p_done THEN now() ELSE NULL END;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_interview_sheet(p_applicant uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_interviewer boolean := public.is_interviewer_of_applicant(p_applicant);
  v_result jsonb;
BEGIN
  IF public.current_admin_id() IS NULL
     OR NOT (v_is_interviewer OR public.has_admin_permission('applicants.view') OR public.has_admin_permission('interview.sessions')) THEN
    RAISE EXCEPTION 'Akses ditolak: Anda bukan pewawancara calon anggota ini.';
  END IF;

  SELECT jsonb_build_object(
    'applicant', jsonb_build_object(
      'id', r.id,
      'full_name', r.full_name,
      'nim', r.nim,
      'prodi', r.prodi,
      'angkatan', r.angkatan,
      'primary_division_id', r.primary_division_id,
      'primary_division_name', r.primary_division_name,
      'secondary_division_id', r.secondary_division_id,
      'secondary_division_name', r.secondary_division_name
    ),
    'answers', coalesce(r.interview_answers, '{}'::jsonb),
    'can_edit', v_is_interviewer OR public.has_admin_permission('applicants.assess') OR public.has_admin_permission('interview.sessions')
  )
  INTO v_result
  FROM public.view_registrations r
  WHERE r.id = p_applicant;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Data pendaftar tidak ditemukan.';
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_interview_answers(p_applicant uuid, p_answers jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.current_admin_id() IS NULL
     OR NOT (public.is_interviewer_of_applicant(p_applicant) OR public.has_admin_permission('applicants.assess') OR public.has_admin_permission('interview.sessions')) THEN
    RAISE EXCEPTION 'Akses ditolak: Anda bukan pewawancara calon anggota ini.';
  END IF;

  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'object' THEN
    RAISE EXCEPTION 'Format catatan tidak valid.';
  END IF;

  IF EXISTS (SELECT 1 FROM jsonb_each(p_answers) e WHERE jsonb_typeof(e.value) <> 'string') THEN
    RAISE EXCEPTION 'Format catatan tidak valid.';
  END IF;

  IF octet_length(p_answers::text) > 200000 THEN
    RAISE EXCEPTION 'Catatan terlalu panjang.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.applicants WHERE id = p_applicant) THEN
    RAISE EXCEPTION 'Data pendaftar tidak ditemukan.';
  END IF;

  INSERT INTO public.assessments (applicant_id, interview_answers, updated_at)
  VALUES (p_applicant, p_answers, timezone('utc'::text, now()))
  ON CONFLICT (applicant_id) DO UPDATE
  SET interview_answers = EXCLUDED.interview_answers,
      updated_at = EXCLUDED.updated_at;
END;
$$;
