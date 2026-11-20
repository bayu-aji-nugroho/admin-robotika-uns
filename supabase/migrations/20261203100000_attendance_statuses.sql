-- Status kehadiran lengkap: Hadir (present), Terlambat (late), Izin (excused), Alpha (absent).
-- * Acara: event_attendances + RPC set_event_attendance (menggantikan set_event_excused).
-- * Jadwal magang: satu tabel internship_attendance berstatus (menggantikan internship_presence &
--   internship_excuses yang masih kosong saat migrasi ini dibuat).

ALTER TABLE public.event_attendances DROP CONSTRAINT IF EXISTS event_attendances_status_check;
ALTER TABLE public.event_attendances
  ADD CONSTRAINT event_attendances_status_check
  CHECK (status IN ('pending', 'present', 'late', 'excused', 'absent'));

DROP FUNCTION IF EXISTS public.set_event_excused(uuid, uuid, boolean);

-- p_status 'pending' = kosongkan (acara terbuka: barisnya dihapus)
CREATE OR REPLACE FUNCTION public.set_event_attendance(p_event_id uuid, p_applicant_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_scope text;
BEGIN
  IF NOT public.has_admin_permission('events.manage') THEN
    RAISE EXCEPTION 'Akses ditolak: Role Anda tidak memiliki hak mengelola acara divisi.';
  END IF;
  IF p_status NOT IN ('pending', 'present', 'late', 'excused', 'absent') THEN
    RAISE EXCEPTION 'Status kehadiran tidak valid.';
  END IF;

  SELECT target_scope INTO v_scope FROM public.division_events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Acara tidak ditemukan.';
  END IF;

  IF p_status = 'pending' THEN
    IF v_scope = 'open' THEN
      DELETE FROM public.event_attendances WHERE event_id = p_event_id AND applicant_id = p_applicant_id;
    ELSE
      UPDATE public.event_attendances SET status = 'pending', checked_in_at = NULL, checked_in_by = NULL
      WHERE event_id = p_event_id AND applicant_id = p_applicant_id;
    END IF;
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.applicants WHERE id = p_applicant_id AND status = 'submitted') THEN
    RAISE EXCEPTION 'Calon anggota tidak ditemukan.';
  END IF;

  INSERT INTO public.event_attendances (event_id, applicant_id, status, checked_in_at, checked_in_by)
  VALUES (
    p_event_id, p_applicant_id, p_status,
    CASE WHEN p_status IN ('present', 'late') THEN now() END,
    v_email
  )
  ON CONFLICT (event_id, applicant_id) DO UPDATE
    SET status = p_status,
        checked_in_at = CASE WHEN p_status IN ('present', 'late')
                             THEN coalesce(public.event_attendances.checked_in_at, now()) END,
        checked_in_by = v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.set_event_attendance(uuid, uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_event_attendance(uuid, uuid, text) TO authenticated;

-- Scan QR: Terlambat juga dianggap sudah hadir (tidak ditimpa jadi Hadir)
CREATE OR REPLACE FUNCTION public.check_in_event_qr(
  p_event_id uuid,
  p_qr_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_clean_token text := btrim(coalesce(p_qr_token, ''));
  v_event record;
  v_att record;
  v_applicant uuid;
  v_person jsonb;
  v_now timestamptz := timezone('utc'::text, now());
BEGIN
  IF NOT public.has_admin_permission('events.manage') THEN
    RAISE EXCEPTION 'Akses ditolak: Role Anda tidak memiliki hak memindai kehadiran acara.';
  END IF;

  IF v_clean_token = '' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'QR token kosong.');
  END IF;

  SELECT is_active, event_date, end_date, target_scope INTO v_event
  FROM public.division_events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'Acara tidak ditemukan.');
  END IF;

  SELECT applicant_id INTO v_applicant FROM public.applicant_qr_tokens WHERE qr_token = v_clean_token;
  IF v_applicant IS NULL THEN
    SELECT applicant_id INTO v_applicant FROM public.event_attendances
    WHERE event_id = p_event_id AND qr_token = v_clean_token;
  END IF;
  IF v_applicant IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'QR Code tidak terdaftar.');
  END IF;

  SELECT jsonb_build_object(
      'full_name', a.full_name,
      'nim', a.nim,
      'prodi', a.prodi,
      'primary_division', (SELECT d.name FROM public.applicant_divisions ad JOIN public.divisions d ON d.id = ad.division_id
                           WHERE ad.applicant_id = a.id AND ad.priority = 1 LIMIT 1),
      'secondary_division', (SELECT d.name FROM public.applicant_divisions ad JOIN public.divisions d ON d.id = ad.division_id
                             WHERE ad.applicant_id = a.id AND ad.priority = 2 LIMIT 1)
    )
  INTO v_person
  FROM public.applicants a WHERE a.id = v_applicant;

  SELECT id, status, checked_in_at INTO v_att
  FROM public.event_attendances WHERE event_id = p_event_id AND applicant_id = v_applicant;

  IF FOUND AND v_att.status IN ('present', 'late') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'already_present', 'checked_in_at', v_att.checked_in_at,
      'applicant', v_person, 'message', 'Peserta sudah tercatat hadir sebelumnya.');
  END IF;

  IF NOT FOUND AND v_event.target_scope <> 'open' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_participant', 'applicant', v_person,
      'message', 'Calon anggota ini bukan peserta acara ini (di luar divisi/cakupan peserta).');
  END IF;

  IF NOT v_event.is_active THEN
    RETURN jsonb_build_object('ok', false, 'code', 'inactive', 'message', 'Acara ini sedang dinonaktifkan.');
  END IF;

  IF v_now < v_event.event_date - interval '1 hour' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_open',
      'message', 'Presensi belum dibuka. Scan bisa dilakukan mulai 1 jam sebelum acara.');
  END IF;

  IF v_now > coalesce(v_event.end_date + interval '1 hour', v_event.event_date + interval '12 hours') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'closed',
      'message', 'Presensi sudah ditutup. Ubah status kehadiran secara manual bila perlu.');
  END IF;

  INSERT INTO public.event_attendances (event_id, applicant_id, status, checked_in_at, checked_in_by)
  VALUES (p_event_id, v_applicant, 'present', v_now, v_email)
  ON CONFLICT (event_id, applicant_id) DO UPDATE
    SET status = 'present', checked_in_at = v_now, checked_in_by = v_email
    WHERE public.event_attendances.status NOT IN ('present', 'late');

  RETURN jsonb_build_object('ok', true, 'code', 'checked_in', 'checked_in_at', v_now,
    'applicant', v_person, 'message', 'Kehadiran berhasil dicatat.');
END;
$$;

REVOKE ALL ON FUNCTION public.check_in_event_qr(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.check_in_event_qr(uuid, text) TO authenticated;

-- Kehadiran jadwal magang (tanpa baris = belum dicatat; lewat jadwal = Alpha di Penilaian)
CREATE TABLE IF NOT EXISTS public.internship_attendance (
  schedule_id uuid NOT NULL REFERENCES public.internship_schedules(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('present', 'late', 'excused', 'absent')),
  updated_by uuid REFERENCES public.admin_whitelist(id) ON DELETE SET NULL DEFAULT public.current_admin_id(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (schedule_id, applicant_id)
);

ALTER TABLE public.internship_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS internship_attendance_select ON public.internship_attendance;
CREATE POLICY internship_attendance_select ON public.internship_attendance
  FOR SELECT TO authenticated USING (public.has_admin_permission('applicants.view'));
DROP POLICY IF EXISTS internship_attendance_insert ON public.internship_attendance;
CREATE POLICY internship_attendance_insert ON public.internship_attendance
  FOR INSERT TO authenticated WITH CHECK (public.has_admin_permission('events.manage'));
DROP POLICY IF EXISTS internship_attendance_update ON public.internship_attendance;
CREATE POLICY internship_attendance_update ON public.internship_attendance
  FOR UPDATE TO authenticated
  USING (public.has_admin_permission('events.manage'))
  WITH CHECK (public.has_admin_permission('events.manage'));
DROP POLICY IF EXISTS internship_attendance_delete ON public.internship_attendance;
CREATE POLICY internship_attendance_delete ON public.internship_attendance
  FOR DELETE TO authenticated USING (public.has_admin_permission('events.manage'));

REVOKE ALL ON public.internship_attendance FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internship_attendance TO authenticated;

-- Tabel lama (kosong saat migrasi ini dibuat) digantikan internship_attendance.
-- Pengaman: batalkan bila ternyata sudah berisi data agar tidak ada yang hilang.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.internship_presence) OR EXISTS (SELECT 1 FROM public.internship_excuses) THEN
    RAISE EXCEPTION 'internship_presence/internship_excuses berisi data; pindahkan dulu sebelum dihapus.';
  END IF;
END $$;
DROP TABLE IF EXISTS public.internship_presence;
DROP TABLE IF EXISTS public.internship_excuses;
