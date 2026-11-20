-- Hak akses baru "grades.manage" (nilai magang di tab Penilaian) yang terpisah dari
-- applicants.assess (keputusan penerimaan), plus role bawaan "Teacher Magang".
ALTER TABLE public.admin_roles DROP CONSTRAINT admin_roles_permissions_known;
ALTER TABLE public.admin_roles ADD CONSTRAINT admin_roles_permissions_known CHECK (
  permissions <@ ARRAY['applicants.view', 'applicants.assess', 'applicants.delete', 'oprec.settings',
    'interview.manage', 'interview.schedule', 'interview.sessions', 'announcements.send',
    'events.manage', 'grades.manage', 'viewer.readonly']::text[]
);

-- Tulis nilai: applicants.assess (perilaku lama) ATAU grades.manage
DROP POLICY assessment_items_insert ON public.assessment_items;
DROP POLICY assessment_items_delete ON public.assessment_items;
DROP POLICY assessment_scores_insert ON public.assessment_scores;
DROP POLICY assessment_scores_update ON public.assessment_scores;
DROP POLICY assessment_scores_delete ON public.assessment_scores;

CREATE POLICY assessment_items_insert ON public.assessment_items FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_permission('applicants.assess') OR public.has_admin_permission('grades.manage'));
CREATE POLICY assessment_items_delete ON public.assessment_items FOR DELETE TO authenticated
  USING (public.has_admin_permission('applicants.assess') OR public.has_admin_permission('grades.manage'));
CREATE POLICY assessment_scores_insert ON public.assessment_scores FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_permission('applicants.assess') OR public.has_admin_permission('grades.manage'));
CREATE POLICY assessment_scores_update ON public.assessment_scores FOR UPDATE TO authenticated
  USING (public.has_admin_permission('applicants.assess') OR public.has_admin_permission('grades.manage'))
  WITH CHECK (public.has_admin_permission('applicants.assess') OR public.has_admin_permission('grades.manage'));
CREATE POLICY assessment_scores_delete ON public.assessment_scores FOR DELETE TO authenticated
  USING (public.has_admin_permission('applicants.assess') OR public.has_admin_permission('grades.manage'));

-- Teacher Magang: lihat calon, isi nilai, kelola jadwal/kehadiran magang & scan acara
INSERT INTO public.admin_roles (name, description, permissions, created_by)
SELECT 'Teacher Magang',
  'Pengajar magang: mengisi nilai & catatan di tab Penilaian, mengelola jadwal & kehadiran magang, dan memindai QR acara. Tidak bisa mengubah keputusan penerimaan.',
  ARRAY['applicants.view', 'grades.manage', 'events.manage'],
  'migration'
WHERE NOT EXISTS (SELECT 1 FROM public.admin_roles WHERE name = 'Teacher Magang');
