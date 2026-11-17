-- Soal terpilih yang sudah terkunci dilengkapi otomatis bila ada divisi yang belum punya
-- soal terpilih (mis. divisi pendaftar diubah setelah lembar wawancara pertama dibuka).
-- Tanpa ini bagian divisi tersebut menampilkan semua soal, bukan 5 acak.

CREATE OR REPLACE FUNCTION public.ensure_interview_question_picks(p_applicant uuid, p_candidate uuid[])
RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := public.current_admin_id();
  v_picks uuid[];
  v_can_lock boolean;
  v_extra uuid[];
BEGIN
  IF v_me IS NULL
     OR NOT (public.is_interviewer_of_applicant(p_applicant)
             OR public.has_admin_permission('applicants.view')
             OR public.has_admin_permission('interview.sessions')) THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  -- Role hanya-lihat (mis. Viewer) tidak ikut mengunci soal
  v_can_lock := public.is_interviewer_of_applicant(p_applicant)
                OR public.has_admin_permission('applicants.assess')
                OR public.has_admin_permission('interview.sessions');

  SELECT question_ids INTO v_picks FROM public.interview_question_picks WHERE applicant_id = p_applicant;
  IF FOUND THEN
    IF NOT v_can_lock OR coalesce(array_length(p_candidate, 1), 0) = 0
       OR array_length(p_candidate, 1) > 60 THEN
      RETURN v_picks;
    END IF;

    -- Tambahkan soal kandidat dari divisi yang belum terwakili di soal terkunci
    SELECT array_agg(c.id) INTO v_extra
    FROM public.interview_questions c
    WHERE c.id = ANY (p_candidate)
      AND NOT (c.id = ANY (v_picks))
      AND NOT EXISTS (
        SELECT 1 FROM public.interview_questions e
        WHERE e.id = ANY (v_picks)
          AND lower(trim(e.division)) = lower(trim(c.division))
      );

    IF v_extra IS NOT NULL THEN
      UPDATE public.interview_question_picks
      SET question_ids = question_ids || v_extra
      WHERE applicant_id = p_applicant
      RETURNING question_ids INTO v_picks;
    END IF;
    RETURN v_picks;
  END IF;

  IF NOT v_can_lock THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.applicants WHERE id = p_applicant) THEN
    RAISE EXCEPTION 'Data pendaftar tidak ditemukan.';
  END IF;

  IF coalesce(array_length(p_candidate, 1), 0) = 0 OR array_length(p_candidate, 1) > 60 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.interview_question_picks (applicant_id, question_ids, created_by)
  SELECT p_applicant, array_agg(q.id), v_me
  FROM public.interview_questions q
  WHERE q.id = ANY (p_candidate)
  HAVING count(*) > 0
  ON CONFLICT (applicant_id) DO NOTHING;

  SELECT question_ids INTO v_picks FROM public.interview_question_picks WHERE applicant_id = p_applicant;
  RETURN v_picks;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_interview_question_picks(uuid, uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.ensure_interview_question_picks(uuid, uuid[]) TO authenticated;
