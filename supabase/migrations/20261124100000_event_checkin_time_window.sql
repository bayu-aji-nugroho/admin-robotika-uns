-- Scan QR hanya diterima saat acara berlangsung: mulai 1 jam sebelum acara sampai 1 jam
-- setelah selesai (tanpa jam selesai: 12 jam setelah mulai), dan acara harus aktif.
-- Tandai hadir manual dari tabel peserta tidak dibatasi (cadangan panitia).
CREATE OR REPLACE FUNCTION public.check_in_event_qr(
  p_event_id uuid,
  p_qr_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_clean_token text := btrim(coalesce(p_qr_token, ''));
  v_row record;
  v_event record;
  v_now timestamptz := timezone('utc'::text, now());
BEGIN
  IF NOT public.has_admin_permission('events.manage') THEN
    RAISE EXCEPTION 'Akses ditolak: Role Anda tidak memiliki hak memindai kehadiran acara.';
  END IF;

  IF v_clean_token = '' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'QR token kosong.');
  END IF;

  SELECT
    ea.id,
    ea.status,
    ea.checked_in_at,
    a.full_name,
    a.nim,
    a.prodi
  INTO v_row
  FROM public.event_attendances ea
  JOIN public.applicants a ON a.id = ea.applicant_id
  WHERE ea.event_id = p_event_id
    AND ea.qr_token = v_clean_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'not_found',
      'message', 'QR Code tidak terdaftar pada acara ini.'
    );
  END IF;

  IF v_row.status = 'present' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'already_present',
      'checked_in_at', v_row.checked_in_at,
      'applicant', jsonb_build_object(
        'full_name', v_row.full_name,
        'nim', v_row.nim,
        'prodi', v_row.prodi
      ),
      'message', 'Peserta sudah tercatat hadir sebelumnya.'
    );
  END IF;

  SELECT is_active, event_date, end_date INTO v_event
  FROM public.division_events WHERE id = p_event_id;

  IF NOT v_event.is_active THEN
    RETURN jsonb_build_object('ok', false, 'code', 'inactive', 'message', 'Acara ini sedang dinonaktifkan.');
  END IF;

  IF v_now < v_event.event_date - interval '1 hour' THEN
    RETURN jsonb_build_object(
      'ok', false, 'code', 'not_open',
      'message', 'Presensi belum dibuka. Scan bisa dilakukan mulai 1 jam sebelum acara.'
    );
  END IF;

  IF v_now > coalesce(v_event.end_date + interval '1 hour', v_event.event_date + interval '12 hours') THEN
    RETURN jsonb_build_object(
      'ok', false, 'code', 'closed',
      'message', 'Presensi sudah ditutup. Gunakan Tandai Hadir Manual bila perlu.'
    );
  END IF;

  UPDATE public.event_attendances
  SET status = 'present',
      checked_in_at = v_now,
      checked_in_by = v_email
  WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'checked_in',
    'checked_in_at', v_now,
    'applicant', jsonb_build_object(
      'full_name', v_row.full_name,
      'nim', v_row.nim,
      'prodi', v_row.prodi
    ),
    'message', 'Kehadiran berhasil dicatat.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_in_event_qr(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.check_in_event_qr(uuid, text) TO authenticated;
