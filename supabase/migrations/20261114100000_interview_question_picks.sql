-- Soal wawancara terpilih per calon anggota: 5 General + 5 Pilihan 1 + 5 Pilihan 2,
-- diacak sekali saat lembar wawancara pertama kali dibuka lalu dikunci di sini.
-- Soal lain tetap bisa dibuka & diisi lewat dropdown "Pertanyaan lain".

CREATE TABLE IF NOT EXISTS public.interview_question_picks (
  applicant_id uuid PRIMARY KEY REFERENCES public.applicants(id) ON DELETE CASCADE,
  question_ids uuid[] NOT NULL,
  created_by uuid REFERENCES public.admin_whitelist(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.interview_question_picks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin aktif membaca soal terpilih" ON public.interview_question_picks;
CREATE POLICY "Admin aktif membaca soal terpilih" ON public.interview_question_picks
  FOR SELECT TO authenticated
  USING (public.is_active_admin());

-- Mengembalikan soal terpilih yang tersimpan. Bila belum ada dan pemanggil berhak mengisi
-- lembar wawancara, simpan p_candidate (hasil acak dari dashboard) lalu kembalikan.
-- Pemanggil lain yang bersamaan tetap mendapat hasil pertama (ON CONFLICT DO NOTHING).
CREATE OR REPLACE FUNCTION public.ensure_interview_question_picks(p_applicant uuid, p_candidate uuid[])
RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := public.current_admin_id();
  v_picks uuid[];
BEGIN
  IF v_me IS NULL
     OR NOT (public.is_interviewer_of_applicant(p_applicant)
             OR public.has_admin_permission('applicants.view')
             OR public.has_admin_permission('interview.sessions')) THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  SELECT question_ids INTO v_picks FROM public.interview_question_picks WHERE applicant_id = p_applicant;
  IF FOUND THEN
    RETURN v_picks;
  END IF;

  -- Role hanya-lihat (mis. Viewer) tidak ikut mengunci soal
  IF NOT (public.is_interviewer_of_applicant(p_applicant)
          OR public.has_admin_permission('applicants.assess')
          OR public.has_admin_permission('interview.sessions')) THEN
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
