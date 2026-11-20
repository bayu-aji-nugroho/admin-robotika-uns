-- Peserta izin, dicari lewat nama/NIM oleh admin.
-- 1) Acara: status 'excused' di event_attendances (dibuat bila belum ada, mis. acara terbuka).
-- 2) Jadwal magang: tabel internship_excuses per jadwal.

CREATE OR REPLACE FUNCTION public.set_event_excused(p_event_id uuid, p_applicant_id uuid, p_excused boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_scope text;
  v_status text;
BEGIN
  IF NOT public.has_admin_permission('events.manage') THEN
    RAISE EXCEPTION 'Akses ditolak: Role Anda tidak memiliki hak mengelola acara divisi.';
  END IF;

  SELECT target_scope INTO v_scope FROM public.division_events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Acara tidak ditemukan.';
  END IF;

  SELECT status INTO v_status FROM public.event_attendances
  WHERE event_id = p_event_id AND applicant_id = p_applicant_id;

  IF p_excused THEN
    IF v_status = 'present' THEN
      RAISE EXCEPTION 'Peserta ini sudah tercatat hadir.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.applicants WHERE id = p_applicant_id AND status = 'submitted') THEN
      RAISE EXCEPTION 'Calon anggota tidak ditemukan.';
    END IF;
    INSERT INTO public.event_attendances (event_id, applicant_id, status, checked_in_by)
    VALUES (p_event_id, p_applicant_id, 'excused', v_email)
    ON CONFLICT (event_id, applicant_id) DO UPDATE
      SET status = 'excused', checked_in_at = NULL, checked_in_by = v_email;
  ELSIF v_status = 'excused' THEN
    -- Batal izin: acara terbuka tidak punya daftar awal, jadi barisnya dihapus
    IF v_scope = 'open' THEN
      DELETE FROM public.event_attendances WHERE event_id = p_event_id AND applicant_id = p_applicant_id;
    ELSE
      UPDATE public.event_attendances SET status = 'pending', checked_in_by = NULL
      WHERE event_id = p_event_id AND applicant_id = p_applicant_id;
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_event_excused(uuid, uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_event_excused(uuid, uuid, boolean) TO authenticated;

CREATE TABLE IF NOT EXISTS public.internship_excuses (
  schedule_id uuid NOT NULL REFERENCES public.internship_schedules(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.admin_whitelist(id) ON DELETE SET NULL DEFAULT public.current_admin_id(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (schedule_id, applicant_id)
);

ALTER TABLE public.internship_excuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS internship_excuses_select ON public.internship_excuses;
CREATE POLICY internship_excuses_select ON public.internship_excuses
  FOR SELECT TO authenticated USING (public.has_admin_permission('applicants.view'));

DROP POLICY IF EXISTS internship_excuses_insert ON public.internship_excuses;
CREATE POLICY internship_excuses_insert ON public.internship_excuses
  FOR INSERT TO authenticated WITH CHECK (public.has_admin_permission('events.manage'));

DROP POLICY IF EXISTS internship_excuses_delete ON public.internship_excuses;
CREATE POLICY internship_excuses_delete ON public.internship_excuses
  FOR DELETE TO authenticated USING (public.has_admin_permission('events.manage'));

REVOKE ALL ON public.internship_excuses FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.internship_excuses TO authenticated;
