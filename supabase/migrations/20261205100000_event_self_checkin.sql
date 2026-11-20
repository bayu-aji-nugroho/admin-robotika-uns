-- Presensi dua arah: selain admin memindai QR calon, admin bisa menampilkan QR acara
-- yang dipindai calon dengan kamera HP (membuka website → absen dengan akun yang login).
-- Kode QR acara berganti tiap 30 detik (HMAC rahasia acara) agar foto QR tidak bisa dibagikan.

-- Tabel terpisah (bukan kolom division_events) karena calon anggota bisa membaca division_events
CREATE TABLE IF NOT EXISTS public.event_checkin_secrets (
  event_id uuid PRIMARY KEY REFERENCES public.division_events(id) ON DELETE CASCADE,
  secret text NOT NULL DEFAULT encode(extensions.gen_random_bytes(24), 'hex')
);
ALTER TABLE public.event_checkin_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_checkin_secrets FROM anon, authenticated;
-- Tanpa policy: hanya lewat RPC di bawah

CREATE OR REPLACE FUNCTION public._event_checkin_secret(p_event_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.division_events WHERE id = p_event_id) THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.event_checkin_secrets (event_id) VALUES (p_event_id) ON CONFLICT (event_id) DO NOTHING;
  SELECT secret INTO v_secret FROM public.event_checkin_secrets WHERE event_id = p_event_id;
  RETURN v_secret;
END;
$$;
REVOKE ALL ON FUNCTION public._event_checkin_secret(uuid) FROM public, anon, authenticated;

-- Kode untuk jendela waktu ke-n (30 detik)
CREATE OR REPLACE FUNCTION public._event_checkin_code(p_secret text, p_window bigint)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT substr(encode(extensions.hmac(p_window::text, p_secret, 'sha256'), 'hex'), 1, 16);
$$;
REVOKE ALL ON FUNCTION public._event_checkin_code(text, bigint) FROM public, anon, authenticated;

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

  v_status := CASE WHEN v_now <= v_event.event_date THEN 'present' ELSE 'late' END;

  INSERT INTO public.event_attendances (event_id, applicant_id, status, checked_in_at, checked_in_by)
  VALUES (p_event_id, p_applicant, v_status, v_now, p_by)
  ON CONFLICT (event_id, applicant_id) DO UPDATE
    SET status = v_status, checked_in_at = v_now, checked_in_by = p_by
    WHERE public.event_attendances.status NOT IN ('present', 'late');

  RETURN jsonb_build_object('ok', true, 'code', 'checked_in', 'status', v_status, 'checked_in_at', v_now,
    'applicant', v_person,
    'message', CASE WHEN v_status = 'present' THEN 'Hadir tepat waktu.' ELSE 'Tercatat terlambat (lewat jam mulai).' END);
END;
$$;
REVOKE ALL ON FUNCTION public._record_event_check_in(uuid, uuid, text) FROM public, anon, authenticated;

-- Admin memindai QR calon (perilaku sama seperti sebelumnya)
CREATE OR REPLACE FUNCTION public.check_in_event_qr(p_event_id uuid, p_qr_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_clean_token text := btrim(coalesce(p_qr_token, ''));
  v_applicant uuid;
BEGIN
  IF NOT public.has_admin_permission('events.manage') THEN
    RAISE EXCEPTION 'Akses ditolak: Role Anda tidak memiliki hak memindai kehadiran acara.';
  END IF;

  IF v_clean_token = '' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'QR token kosong.');
  END IF;

  SELECT applicant_id INTO v_applicant FROM public.applicant_qr_tokens WHERE qr_token = v_clean_token;
  IF v_applicant IS NULL THEN
    SELECT applicant_id INTO v_applicant FROM public.event_attendances
    WHERE event_id = p_event_id AND qr_token = v_clean_token;
  END IF;
  IF v_applicant IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'QR Code tidak terdaftar.');
  END IF;

  RETURN public._record_event_check_in(p_event_id, v_applicant, lower(coalesce(auth.jwt() ->> 'email', '')));
END;
$$;
REVOKE ALL ON FUNCTION public.check_in_event_qr(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.check_in_event_qr(uuid, text) TO authenticated;

-- Admin: kode QR acara saat ini (dipanggil ulang tiap beberapa detik)
CREATE OR REPLACE FUNCTION public.get_event_checkin_code(p_event_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret text;
BEGIN
  IF NOT public.has_admin_permission('events.manage') THEN
    RAISE EXCEPTION 'Akses ditolak: Role Anda tidak memiliki hak mengelola presensi acara.';
  END IF;
  v_secret := public._event_checkin_secret(p_event_id);
  IF v_secret IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN public._event_checkin_code(v_secret, floor(extract(epoch FROM now()) / 30)::bigint);
END;
$$;
REVOKE ALL ON FUNCTION public.get_event_checkin_code(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_event_checkin_code(uuid) TO authenticated;

-- Website: calon anggota yang login absen sendiri dengan memindai QR acara
CREATE OR REPLACE FUNCTION public.self_check_in_event(p_event_id uuid, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret text;
  v_window bigint := floor(extract(epoch FROM now()) / 30)::bigint;
  v_applicant uuid;
BEGIN
  SELECT id INTO v_applicant FROM public.applicants
  WHERE user_id = auth.uid() AND status = 'submitted';
  IF v_applicant IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_applicant',
      'message', 'Akun ini belum mengirim pendaftaran OPREC.');
  END IF;

  v_secret := public._event_checkin_secret(p_event_id);
  IF v_secret IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'Acara tidak ditemukan.');
  END IF;

  -- Terima 5 jendela terakhir (±2,5 menit) agar sempat login Google dulu setelah memindai
  IF NOT EXISTS (
    SELECT 1 FROM generate_series(0, 4) g
    WHERE public._event_checkin_code(v_secret, v_window - g) = btrim(coalesce(p_code, ''))
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'expired',
      'message', 'QR acara sudah kedaluwarsa. Pindai ulang QR yang tampil di layar panitia.');
  END IF;

  RETURN public._record_event_check_in(p_event_id, v_applicant, 'mandiri');
END;
$$;
REVOKE ALL ON FUNCTION public.self_check_in_event(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.self_check_in_event(uuid, text) TO authenticated;
