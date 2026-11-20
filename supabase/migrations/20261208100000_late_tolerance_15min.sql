-- Terlambat baru dihitung setelah 15 menit dari jam mulai acara (toleransi).
-- Logika pencatatan bersama (scan oleh admin & absen mandiri)
CREATE OR REPLACE FUNCTION public._record_event_check_in(p_event_id uuid, p_applicant uuid, p_by text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_event record;
  v_att record;
  v_person jsonb;
  v_status text;
  v_now timestamptz := timezone('utc'::text, now());
BEGIN
  SELECT is_active, event_date, target_scope INTO v_event
  FROM public.division_events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'Acara tidak ditemukan.');
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
  FROM public.applicants a WHERE a.id = p_applicant;

  SELECT id, status, checked_in_at INTO v_att
  FROM public.event_attendances WHERE event_id = p_event_id AND applicant_id = p_applicant;

  IF FOUND AND v_att.status IN ('present', 'late') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'already_present', 'status', v_att.status,
      'checked_in_at', v_att.checked_in_at, 'applicant', v_person,
      'message', 'Peserta sudah tercatat hadir sebelumnya.');
  END IF;

  IF NOT FOUND AND v_event.target_scope <> 'open' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_participant', 'applicant', v_person,
      'message', 'Calon anggota ini bukan peserta acara ini (di luar divisi/cakupan peserta).');
  END IF;

  IF NOT v_event.is_active THEN
    RETURN jsonb_build_object('ok', false, 'code', 'inactive', 'message', 'Acara ini sedang dinonaktifkan.');
  END IF;

  -- Toleransi 15 menit setelah jam mulai masih dihitung Hadir
  v_status := CASE WHEN v_now <= v_event.event_date + interval '15 minutes' THEN 'present' ELSE 'late' END;

  INSERT INTO public.event_attendances (event_id, applicant_id, status, checked_in_at, checked_in_by)
  VALUES (p_event_id, p_applicant, v_status, v_now, p_by)
  ON CONFLICT (event_id, applicant_id) DO UPDATE
    SET status = v_status, checked_in_at = v_now, checked_in_by = p_by
    WHERE public.event_attendances.status NOT IN ('present', 'late');

  RETURN jsonb_build_object('ok', true, 'code', 'checked_in', 'status', v_status, 'checked_in_at', v_now,
    'applicant', v_person,
    'message', CASE WHEN v_status = 'present' THEN 'Hadir tepat waktu.' ELSE 'Tercatat terlambat (lewat 15 menit dari jam mulai).' END);
END;
$$;
REVOKE ALL ON FUNCTION public._record_event_check_in(uuid, uuid, text) FROM public, anon, authenticated;
