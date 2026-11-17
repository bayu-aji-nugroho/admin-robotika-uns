-- Auto-save lembar wawancara: hanya kunci yang berubah yang dikirim lalu digabung
-- dengan catatan yang sudah ada, sehingga dua pewawancara yang mengetik bersamaan
-- tidak saling menimpa. Nilai kosong ("") = hapus kunci tersebut.
CREATE OR REPLACE FUNCTION public.patch_interview_answers(p_applicant uuid, p_changes jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_set jsonb;
  v_removed text[];
  v_merged jsonb;
BEGIN
  IF public.current_admin_id() IS NULL
     OR NOT (public.is_interviewer_of_applicant(p_applicant) OR public.has_admin_permission('applicants.assess') OR public.has_admin_permission('interview.sessions')) THEN
    RAISE EXCEPTION 'Akses ditolak: Anda bukan pewawancara calon anggota ini.';
  END IF;

  IF p_changes IS NULL OR jsonb_typeof(p_changes) <> 'object' THEN
    RAISE EXCEPTION 'Format catatan tidak valid.';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_each(p_changes) e WHERE jsonb_typeof(e.value) <> 'string') THEN
    RAISE EXCEPTION 'Format catatan tidak valid.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.applicants WHERE id = p_applicant) THEN
    RAISE EXCEPTION 'Data pendaftar tidak ditemukan.';
  END IF;

  SELECT coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
    INTO v_set
    FROM jsonb_each(p_changes)
   WHERE btrim(value #>> '{}') <> '';
  SELECT coalesce(array_agg(key), '{}')
    INTO v_removed
    FROM jsonb_each(p_changes)
   WHERE btrim(value #>> '{}') = '';

  INSERT INTO public.assessments (applicant_id, interview_answers, updated_at)
  VALUES (p_applicant, v_set, timezone('utc'::text, now()))
  ON CONFLICT (applicant_id) DO UPDATE
  SET interview_answers = (coalesce(public.assessments.interview_answers, '{}'::jsonb) || v_set) - v_removed,
      updated_at = EXCLUDED.updated_at
  RETURNING interview_answers INTO v_merged;

  IF octet_length(v_merged::text) > 200000 THEN
    RAISE EXCEPTION 'Catatan terlalu panjang.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.patch_interview_answers(uuid, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.patch_interview_answers(uuid, jsonb) TO authenticated;
