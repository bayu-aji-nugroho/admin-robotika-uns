-- Satu QR presensi tetap per calon anggota (tampil di Dashboard walau belum ada acara),
-- dipakai untuk semua acara. Scanner admin mencocokkan QR ini ke tiket acara yang dibuka.
CREATE TABLE IF NOT EXISTS public.applicant_qr_tokens (
  applicant_id uuid PRIMARY KEY REFERENCES public.applicants(id) ON DELETE CASCADE,
  qr_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.applicant_qr_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.applicant_qr_tokens FROM anon, authenticated;
-- Tanpa policy: hanya bisa diakses lewat RPC di bawah

-- Website: QR milik akun yang login (dibuat sekali, setelah pendaftaran terkirim)
CREATE OR REPLACE FUNCTION public.get_my_attendance_qr()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_applicant uuid;
  v_token text;
BEGIN
  SELECT id INTO v_applicant FROM public.applicants
  WHERE user_id = auth.uid() AND status = 'submitted';
  IF v_applicant IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.applicant_qr_tokens (applicant_id) VALUES (v_applicant)
  ON CONFLICT (applicant_id) DO NOTHING;

  SELECT qr_token INTO v_token FROM public.applicant_qr_tokens WHERE applicant_id = v_applicant;
  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_attendance_qr() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_attendance_qr() TO authenticated;

-- Scan: terima QR pribadi (baru) maupun QR tiket per acara (lama)
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
  v_personal uuid;
  v_now timestamptz := timezone('utc'::text, now());
BEGIN
  IF NOT public.has_admin_permission('events.manage') THEN
    RAISE EXCEPTION 'Akses ditolak: Role Anda tidak memiliki hak memindai kehadiran acara.';
  END IF;

  IF v_clean_token = '' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'QR token kosong.');
  END IF;

  SELECT applicant_id INTO v_personal FROM public.applicant_qr_tokens WHERE qr_token = v_clean_token;

  SELECT ea.id, ea.status, ea.checked_in_at, a.full_name, a.nim, a.prodi
  INTO v_row
  FROM public.event_attendances ea
  JOIN public.applicants a ON a.id = ea.applicant_id
  WHERE ea.event_id = p_event_id
    AND (ea.qr_token = v_clean_token OR ea.applicant_id = v_personal);

  IF NOT FOUND THEN
    IF v_personal IS NOT NULL THEN
      SELECT full_name, nim, prodi INTO v_row FROM public.applicants WHERE id = v_personal;
      RETURN jsonb_build_object(
        'ok', false, 'code', 'not_participant',
        'applicant', jsonb_build_object('full_name', v_row.full_name, 'nim', v_row.nim, 'prodi', v_row.prodi),
        'message', 'Calon anggota ini bukan peserta acara ini (di luar divisi/cakupan peserta).'
      );
    END IF;
    RETURN jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'QR Code tidak terdaftar.');
  END IF;

  IF v_row.status = 'present' THEN
    RETURN jsonb_build_object(
      'ok', false, 'code', 'already_present', 'checked_in_at', v_row.checked_in_at,
      'applicant', jsonb_build_object('full_name', v_row.full_name, 'nim', v_row.nim, 'prodi', v_row.prodi),
      'message', 'Peserta sudah tercatat hadir sebelumnya.'
    );
  END IF;

  SELECT is_active, event_date, end_date INTO v_event
  FROM public.division_events WHERE id = p_event_id;

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

  UPDATE public.event_attendances
  SET status = 'present', checked_in_at = v_now, checked_in_by = v_email
  WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'ok', true, 'code', 'checked_in', 'checked_in_at', v_now,
    'applicant', jsonb_build_object('full_name', v_row.full_name, 'nim', v_row.nim, 'prodi', v_row.prodi),
    'message', 'Kehadiran berhasil dicatat.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_in_event_qr(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.check_in_event_qr(uuid, text) TO authenticated;
