-- Lembar wawancara langsung dari halaman Jadwal + tanda sesi selesai.
-- * interview_bookings.completed_at/completed_by: sesi ditandai selesai oleh pewawancaranya.
-- * get_interview_sheet / save_interview_answers: pewawancara sesi itu boleh membaca data
--   pendaftar & menyimpan catatan jawaban walau role-nya tidak punya applicants.view/assess.
--   Admin dengan applicants.view (baca) / applicants.assess (simpan) tetap bisa seperti biasa.

ALTER TABLE public.interview_bookings
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES public.admin_whitelist(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.is_interviewer_of_applicant(p_applicant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.interview_bookings b
    WHERE b.applicant_id = p_applicant
      AND public.current_admin_id() = ANY (b.interviewer_ids)
  );
$$;

REVOKE ALL ON FUNCTION public.is_interviewer_of_applicant(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_interviewer_of_applicant(uuid) TO authenticated;

-- Tandai / batalkan sesi selesai
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

  IF NOT (v_me = ANY (v_booking.interviewer_ids)) AND NOT public.is_admin_superuser() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya pewawancara sesi ini atau superadmin yang dapat menandai selesai.';
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

REVOKE ALL ON FUNCTION public.set_interview_completed(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_interview_completed(uuid, boolean) TO authenticated;

-- Data lembar wawancara satu pendaftar (identitas, divisi pilihan, catatan tersimpan)
CREATE OR REPLACE FUNCTION public.get_interview_sheet(p_applicant uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_interviewer boolean := public.is_interviewer_of_applicant(p_applicant);
  v_result jsonb;
BEGIN
  IF public.current_admin_id() IS NULL
     OR NOT (v_is_interviewer OR public.has_admin_permission('applicants.view')) THEN
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
    'can_edit', v_is_interviewer OR public.has_admin_permission('applicants.assess')
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

REVOKE ALL ON FUNCTION public.get_interview_sheet(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_interview_sheet(uuid) TO authenticated;

-- Simpan catatan jawaban wawancara (hanya kolom interview_answers; status penilaian tidak disentuh)
CREATE OR REPLACE FUNCTION public.save_interview_answers(p_applicant uuid, p_answers jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.current_admin_id() IS NULL
     OR NOT (public.is_interviewer_of_applicant(p_applicant) OR public.has_admin_permission('applicants.assess')) THEN
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

REVOKE ALL ON FUNCTION public.save_interview_answers(uuid, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.save_interview_answers(uuid, jsonb) TO authenticated;

-- Dashboard jadwal: sertakan applicant_id & completed_at pada booking
CREATE OR REPLACE FUNCTION public.get_schedule_dashboard()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_from timestamptz := now() - interval '1 hour';
  v_to timestamptz := now() + interval '60 days';
  v_result jsonb;
BEGIN
  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  WITH av AS (
    SELECT admin_id, start_at, nullif(btrim(location), '') AS loc
    FROM public.interview_admin_availability
    WHERE start_at >= v_from AND start_at < v_to
  ),
  lc AS (
    SELECT y.loc, (row_number() OVER (ORDER BY y.loc) - 1)::int AS idx
    FROM (SELECT DISTINCT loc FROM av WHERE loc IS NOT NULL) y
  ),
  grouped AS (
    SELECT av.admin_id,
           jsonb_agg(jsonb_build_array(extract(epoch FROM av.start_at)::bigint, lc.idx) ORDER BY av.start_at) AS slots
    FROM av LEFT JOIN lc ON lc.loc = av.loc
    GROUP BY av.admin_id
  )
  SELECT jsonb_build_object(
    'from', v_from,
    'to', v_to,
    'locations', coalesce((SELECT jsonb_agg(lc.loc ORDER BY lc.idx) FROM lc), '[]'::jsonb),
    'member_availability', coalesce((
      SELECT jsonb_agg(jsonb_build_object('admin_id', g.admin_id, 'slots', g.slots)) FROM grouped g
    ), '[]'::jsonb),
    'bookings', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'applicant_id', b.applicant_id,
          'pair_id', b.pair_id,
          'interviewer_ids', b.interviewer_ids,
          'start_at', b.start_at,
          'location', b.location,
          'status', b.status,
          'completed_at', b.completed_at,
          'applicant_name', a.full_name,
          'applicant_nim', a.nim
        ) ORDER BY b.start_at
      )
      FROM public.interview_bookings b
      LEFT JOIN public.applicants a ON a.id = b.applicant_id
      -- Sesi yang sudah lewat tetap tampil sampai ditandai selesai
      WHERE b.start_at >= v_from OR b.completed_at IS NULL
    ), '[]'::jsonb)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_schedule_dashboard() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_schedule_dashboard() TO authenticated;
