-- Jadwal magang per divisi (tanggal, jam, tempat). Admin menambah lewat dashboard;
-- calon anggota melihat jadwal divisi Pilihan 1-nya di Dashboard website.
CREATE TABLE IF NOT EXISTS public.internship_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id varchar NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  location text NOT NULL CHECK (char_length(btrim(location)) BETWEEN 2 AND 200),
  created_by uuid REFERENCES public.admin_whitelist(id) ON DELETE SET NULL DEFAULT public.current_admin_id(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS internship_schedules_division_idx
  ON public.internship_schedules (division_id, scheduled_at);

-- Divisi Pilihan 1 akun yang login (hanya pendaftaran terkirim)
CREATE OR REPLACE FUNCTION public.my_primary_division()
RETURNS varchar
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ad.division_id
  FROM public.applicant_divisions ad
  JOIN public.applicants a ON a.id = ad.applicant_id
  WHERE a.user_id = auth.uid() AND a.status = 'submitted' AND ad.priority = 1
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.my_primary_division() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_primary_division() TO authenticated;

ALTER TABLE public.internship_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS internship_schedules_select ON public.internship_schedules;
CREATE POLICY internship_schedules_select ON public.internship_schedules
  FOR SELECT TO authenticated
  USING (public.has_admin_permission('applicants.view') OR division_id = public.my_primary_division());

DROP POLICY IF EXISTS internship_schedules_insert ON public.internship_schedules;
CREATE POLICY internship_schedules_insert ON public.internship_schedules
  FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_permission('events.manage'));

DROP POLICY IF EXISTS internship_schedules_delete ON public.internship_schedules;
CREATE POLICY internship_schedules_delete ON public.internship_schedules
  FOR DELETE TO authenticated
  USING (public.has_admin_permission('events.manage'));

REVOKE ALL ON public.internship_schedules FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.internship_schedules TO authenticated;
