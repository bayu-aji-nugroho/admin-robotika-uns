-- Fitur Jadwal Magang dihapus (tidak dipakai; tabel kosong saat dihapus).
-- Riwayat pertemuan calon kini hanya dari acara divisi.
CREATE OR REPLACE FUNCTION public.get_my_meeting_history()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_applicant uuid;
  v_division varchar;
  v_meetings jsonb;
BEGIN
  SELECT id INTO v_applicant FROM public.applicants WHERE user_id = auth.uid() AND status = 'submitted';
  IF v_applicant IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT division_id INTO v_division FROM public.applicant_divisions
  WHERE applicant_id = v_applicant AND priority = 1 LIMIT 1;

  SELECT coalesce(jsonb_agg(m ORDER BY m->>'at' DESC), '[]'::jsonb) INTO v_meetings
  FROM (
    SELECT jsonb_build_object(
        'title', e.title, 'at', e.event_date, 'location', e.location,
        'status', CASE WHEN a.status IS NULL OR a.status = 'pending' THEN 'absent' ELSE a.status END) AS m
    FROM public.division_events e
    LEFT JOIN public.event_attendances a ON a.event_id = e.id AND a.applicant_id = v_applicant
    WHERE e.is_active AND e.event_date <= now()
      AND (e.division_id IS NULL OR e.division_id = v_division OR a.id IS NOT NULL)
  ) q;

  RETURN jsonb_build_object(
    'meetings', v_meetings,
    'contact_name', (SELECT full_name FROM public.admin_whitelist WHERE email = 'dwikurnia12@student.uns.ac.id'),
    'contact_whatsapp', (SELECT interview_whatsapp FROM public.admin_whitelist WHERE email = 'dwikurnia12@student.uns.ac.id')
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_meeting_history() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_meeting_history() TO authenticated;

-- Pengaman: hanya hapus bila memang masih kosong
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.internship_schedules) OR EXISTS (SELECT 1 FROM public.internship_attendance) THEN
    RAISE EXCEPTION 'Jadwal magang masih berisi data; batalkan penghapusan.';
  END IF;
END $$;
DROP TABLE public.internship_attendance;
DROP TABLE public.internship_schedules;

UPDATE public.admin_roles
SET description = 'Pengajar magang: mengisi nilai & catatan di tab Penilaian, membuat acara, mengelola kehadiran, dan memindai QR acara. Tidak bisa mengubah keputusan penerimaan.'
WHERE name = 'Teacher Magang';
