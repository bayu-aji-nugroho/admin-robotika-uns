-- Tab Penilaian calon anggota (per divisi Pilihan 1):
-- * Kolom pertemuan otomatis: jadwal magang (kehadiran diisi admin) & acara divisi (dari scan QR).
-- * Kolom item penilaian buatan admin: nilai 0-100 + catatan.

-- Kehadiran jadwal magang yang ditandai admin ("Hadir"). Izin tetap di internship_excuses;
-- tanpa keduanya = Alpha.
CREATE TABLE IF NOT EXISTS public.internship_presence (
  schedule_id uuid NOT NULL REFERENCES public.internship_schedules(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.admin_whitelist(id) ON DELETE SET NULL DEFAULT public.current_admin_id(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (schedule_id, applicant_id)
);

CREATE TABLE IF NOT EXISTS public.assessment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id varchar NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 80),
  created_by uuid REFERENCES public.admin_whitelist(id) ON DELETE SET NULL DEFAULT public.current_admin_id(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assessment_items_division_idx ON public.assessment_items (division_id, created_at);

CREATE TABLE IF NOT EXISTS public.assessment_scores (
  item_id uuid NOT NULL REFERENCES public.assessment_items(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  score numeric(5,2) CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  updated_by uuid REFERENCES public.admin_whitelist(id) ON DELETE SET NULL DEFAULT public.current_admin_id(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, applicant_id)
);

ALTER TABLE public.internship_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_scores ENABLE ROW LEVEL SECURITY;

-- Baca: admin dengan akses lihat pendaftar
DROP POLICY IF EXISTS internship_presence_select ON public.internship_presence;
CREATE POLICY internship_presence_select ON public.internship_presence
  FOR SELECT TO authenticated USING (public.has_admin_permission('applicants.view'));
DROP POLICY IF EXISTS assessment_items_select ON public.assessment_items;
CREATE POLICY assessment_items_select ON public.assessment_items
  FOR SELECT TO authenticated USING (public.has_admin_permission('applicants.view'));
DROP POLICY IF EXISTS assessment_scores_select ON public.assessment_scores;
CREATE POLICY assessment_scores_select ON public.assessment_scores
  FOR SELECT TO authenticated USING (public.has_admin_permission('applicants.view'));

-- Kehadiran magang: sama dengan pengelola izin (Kelola acara divisi)
DROP POLICY IF EXISTS internship_presence_insert ON public.internship_presence;
CREATE POLICY internship_presence_insert ON public.internship_presence
  FOR INSERT TO authenticated WITH CHECK (public.has_admin_permission('events.manage'));
DROP POLICY IF EXISTS internship_presence_delete ON public.internship_presence;
CREATE POLICY internship_presence_delete ON public.internship_presence
  FOR DELETE TO authenticated USING (public.has_admin_permission('events.manage'));

-- Item & nilai: izin Nilai pendaftar
DROP POLICY IF EXISTS assessment_items_insert ON public.assessment_items;
CREATE POLICY assessment_items_insert ON public.assessment_items
  FOR INSERT TO authenticated WITH CHECK (public.has_admin_permission('applicants.assess'));
DROP POLICY IF EXISTS assessment_items_delete ON public.assessment_items;
CREATE POLICY assessment_items_delete ON public.assessment_items
  FOR DELETE TO authenticated USING (public.has_admin_permission('applicants.assess'));

DROP POLICY IF EXISTS assessment_scores_insert ON public.assessment_scores;
CREATE POLICY assessment_scores_insert ON public.assessment_scores
  FOR INSERT TO authenticated WITH CHECK (public.has_admin_permission('applicants.assess'));
DROP POLICY IF EXISTS assessment_scores_update ON public.assessment_scores;
CREATE POLICY assessment_scores_update ON public.assessment_scores
  FOR UPDATE TO authenticated
  USING (public.has_admin_permission('applicants.assess'))
  WITH CHECK (public.has_admin_permission('applicants.assess'));
DROP POLICY IF EXISTS assessment_scores_delete ON public.assessment_scores;
CREATE POLICY assessment_scores_delete ON public.assessment_scores
  FOR DELETE TO authenticated USING (public.has_admin_permission('applicants.assess'));

REVOKE ALL ON public.internship_presence, public.assessment_items, public.assessment_scores FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.internship_presence TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.assessment_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_scores TO authenticated;
