-- Lokasi wawancara melekat ke SESI (booking), dicatat oleh pewawancara setelah
-- disepakati dengan calon anggota via WhatsApp.
-- * Booking baru / pindah jadwal dibuat TANPA lokasi (tidak lagi diambil otomatis dari kalender).
-- * set_booking_location: pewawancara sesi itu atau superadmin mencatat lokasi, boleh diterapkan
--   ke semua sesi pasangan yang sama di tanggal yang sama. Tetap bisa diubah setelah Accept.

CREATE OR REPLACE FUNCTION public.book_interview_slot(p_start_at timestamptz, p_pair_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_applicant uuid := public.current_submitted_applicant_id();
  v_booking public.interview_bookings%ROWTYPE;
  v_pick record;
BEGIN
  IF v_applicant IS NULL THEN
    RAISE EXCEPTION 'Hanya calon anggota yang sudah mengirim formulir yang dapat memilih jadwal wawancara.';
  END IF;

  IF p_start_at IS NULL OR p_start_at <= now() THEN
    RAISE EXCEPTION 'Jadwal yang dipilih sudah lewat. Silakan pilih jadwal lain.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('interview_slot:' || p_start_at::text));

  SELECT * INTO v_booking FROM public.interview_bookings WHERE applicant_id = v_applicant FOR UPDATE;

  IF FOUND AND v_booking.status = 'accepted' THEN
    RAISE EXCEPTION 'Jadwal wawancara Anda sudah dikonfirmasi dan tidak dapat diubah.';
  END IF;

  IF p_pair_id IS NULL THEN
    SELECT * INTO v_pick FROM public.pick_interview_pair_for_slot(p_start_at, v_booking.id);
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Jadwal ini sudah penuh. Silakan pilih jadwal lain.';
    END IF;
  ELSE
    SELECT p.id AS pair_id, p.member_a, p.member_b
    INTO v_pick
    FROM public.interview_availability av
    JOIN public.interview_pairs p ON p.id = av.pair_id AND p.status = 'active'
    JOIN public.admin_whitelist wa ON wa.id = p.member_a AND wa.is_active = true
    JOIN public.admin_whitelist wb ON wb.id = p.member_b AND wb.is_active = true
    WHERE av.pair_id = p_pair_id
      AND av.start_at = p_start_at
      AND NOT EXISTS (
        SELECT 1 FROM public.interview_bookings b
        WHERE b.pair_id = p.id AND b.start_at = p_start_at
          AND b.id IS DISTINCT FROM v_booking.id
      );
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Jadwal ini sudah tidak tersedia. Silakan pilih jadwal lain.';
    END IF;
  END IF;

  IF v_booking.id IS NULL THEN
    INSERT INTO public.interview_bookings (applicant_id, pair_id, interviewer_ids, start_at, location)
    VALUES (v_applicant, v_pick.pair_id, ARRAY[v_pick.member_a, v_pick.member_b], p_start_at, NULL);
  ELSE
    UPDATE public.interview_bookings
    SET pair_id = v_pick.pair_id,
        interviewer_ids = ARRAY[v_pick.member_a, v_pick.member_b],
        start_at = p_start_at,
        location = NULL,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_booking.id;
  END IF;

  RETURN public.get_my_interview_booking();
END;
$$;

CREATE OR REPLACE FUNCTION public.set_booking_location(
  p_booking uuid,
  p_location text,
  p_apply_same_day boolean DEFAULT false
)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := public.current_admin_id();
  v_booking public.interview_bookings%ROWTYPE;
  v_location text := nullif(btrim(coalesce(p_location, '')), '');
  v_count int;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  SELECT * INTO v_booking FROM public.interview_bookings WHERE id = p_booking;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesi wawancara tidak ditemukan.';
  END IF;

  IF NOT (v_me = ANY (v_booking.interviewer_ids)) AND NOT public.is_admin_superuser() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya pewawancara sesi ini atau superadmin yang dapat mencatat lokasi.';
  END IF;

  IF v_location IS NOT NULL AND char_length(v_location) > 300 THEN
    RAISE EXCEPTION 'Lokasi/link maksimal 300 karakter.';
  END IF;

  UPDATE public.interview_bookings b
  SET location = v_location, updated_at = timezone('utc'::text, now())
  WHERE b.id = v_booking.id
     OR (
       p_apply_same_day
       AND v_booking.pair_id IS NOT NULL
       AND b.pair_id = v_booking.pair_id
       AND (b.start_at AT TIME ZONE 'Asia/Jakarta')::date = (v_booking.start_at AT TIME ZONE 'Asia/Jakarta')::date
     );
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.set_booking_location(uuid, text, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_booking_location(uuid, text, boolean) TO authenticated;
