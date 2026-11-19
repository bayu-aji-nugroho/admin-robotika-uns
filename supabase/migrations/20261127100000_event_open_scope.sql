-- Cakupan acara "open": terbuka untuk SEMUA calon anggota yang sudah mengirim pendaftaran.
-- Tidak ada daftar peserta di awal; baris kehadiran dibuat saat QR pribadi dipindai.
-- Hasil scan juga menampilkan pilihan divisi calon anggota.

ALTER TABLE public.division_events DROP CONSTRAINT IF EXISTS division_events_target_scope_check;
ALTER TABLE public.division_events
  ADD CONSTRAINT division_events_target_scope_check
  CHECK (target_scope IN ('open', 'accepted', 'registered_p1', 'registered_all'));
ALTER TABLE public.division_events ALTER COLUMN target_scope SET DEFAULT 'open';

-- 'open' tidak membuat daftar peserta di awal
CREATE OR REPLACE FUNCTION public._populate_event_attendances(
  p_event_id uuid,
  p_division_id varchar,
  p_target_scope text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_inserted integer := 0;
BEGIN
  IF p_target_scope = 'open' THEN
    RETURN 0;
  ELSIF p_target_scope = 'accepted' THEN
    INSERT INTO public.event_attendances (event_id, applicant_id)
    SELECT p_event_id, s.applicant_id
    FROM public.assessments s
    WHERE s.accepted_division_id = p_division_id
      AND lower(coalesce(s.status, '')) IN ('diterima', 'accepted', 'lolos', 'acc')
    ON CONFLICT (event_id, applicant_id) DO NOTHING;
  ELSIF p_target_scope = 'registered_p1' THEN
    INSERT INTO public.event_attendances (event_id, applicant_id)
    SELECT DISTINCT p_event_id, ad.applicant_id
    FROM public.applicant_divisions ad
    JOIN public.applicants a ON a.id = ad.applicant_id
    WHERE ad.division_id = p_division_id
      AND ad.priority = 1
      AND a.submitted_at IS NOT NULL
    ON CONFLICT (event_id, applicant_id) DO NOTHING;
  ELSE
    INSERT INTO public.event_attendances (event_id, applicant_id)
    SELECT DISTINCT p_event_id, ad.applicant_id
    FROM public.applicant_divisions ad
    JOIN public.applicants a ON a.id = ad.applicant_id
    WHERE ad.division_id = p_division_id
      AND a.submitted_at IS NOT NULL
    ON CONFLICT (event_id, applicant_id) DO NOTHING;
  END IF;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_division_event(
  p_title text,
  p_division_id varchar,
  p_event_date timestamptz,
  p_target_scope text DEFAULT 'open',
  p_description text DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_location text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_event_id uuid;
  v_tickets integer := 0;
BEGIN
  IF NOT public.has_admin_permission('events.manage') THEN
    RAISE EXCEPTION 'Akses ditolak: Role Anda tidak memiliki hak mengelola acara divisi.';
  END IF;

  IF char_length(btrim(coalesce(p_title, ''))) < 2 THEN
    RAISE EXCEPTION 'Judul acara minimal 2 karakter.';
  END IF;

  IF p_target_scope NOT IN ('open', 'accepted', 'registered_p1', 'registered_all') THEN
    RAISE EXCEPTION 'Cakupan peserta tidak valid.';
  END IF;

  INSERT INTO public.division_events (
    title, description, division_id, target_scope,
    event_date, end_date, location, created_by
  )
  VALUES (
    btrim(p_title),
    nullif(btrim(coalesce(p_description, '')), ''),
    p_division_id,
    p_target_scope,
    p_event_date,
    p_end_date,
    nullif(btrim(coalesce(p_location, '')), ''),
    v_email
  )
  RETURNING id INTO v_event_id;

  v_tickets := public._populate_event_attendances(v_event_id, p_division_id, p_target_scope);

  RETURN jsonb_build_object('event_id', v_event_id, 'tickets_created', v_tickets);
END;
$$;

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

  -- QR pribadi (baru) atau QR tiket per acara (lama)
  SELECT applicant_id INTO v_applicant FROM public.applicant_qr_tokens WHERE qr_token = v_clean_token;
  IF v_applicant IS NULL THEN
    SELECT applicant_id INTO v_applicant FROM public.event_attendances
    WHERE event_id = p_event_id AND qr_token = v_clean_token;
  END IF;
  IF v_applicant IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'QR Code tidak terdaftar.');
  END IF;

  -- Data yang ditampilkan ke panitia: nama, NIM, prodi, pilihan divisi
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

  IF FOUND AND v_att.status = 'present' THEN
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
      'message', 'Presensi sudah ditutup. Gunakan Tandai Hadir Manual bila perlu.');
  END IF;

  -- Acara terbuka: baris kehadiran dibuat saat scan (ON CONFLICT aman bila dua panitia scan bersamaan)
  INSERT INTO public.event_attendances (event_id, applicant_id, status, checked_in_at, checked_in_by)
  VALUES (p_event_id, v_applicant, 'present', v_now, v_email)
  ON CONFLICT (event_id, applicant_id) DO UPDATE
    SET status = 'present', checked_in_at = v_now, checked_in_by = v_email
    WHERE public.event_attendances.status <> 'present';

  RETURN jsonb_build_object('ok', true, 'code', 'checked_in', 'checked_in_at', v_now,
    'applicant', v_person, 'message', 'Kehadiran berhasil dicatat.');
END;
$$;

REVOKE ALL ON FUNCTION public.check_in_event_qr(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.check_in_event_qr(uuid, text) TO authenticated;
