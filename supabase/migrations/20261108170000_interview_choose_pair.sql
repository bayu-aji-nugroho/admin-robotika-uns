-- Calon anggota memilih pasangan pewawancara terlebih dahulu, lalu tanggal & jam.
-- * get_interview_slots: kembalikan SEMUA kombinasi (pasangan, jam) yang masih kosong.
-- * book_interview_slot: menerima p_pair_id (opsional). Tanpa p_pair_id, sistem
--   tetap memilih pasangan otomatis seperti sebelumnya.

CREATE OR REPLACE FUNCTION public.get_interview_slots()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_applicant uuid := public.current_submitted_applicant_id();
  v_booking uuid;
BEGIN
  IF v_applicant IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT id INTO v_booking FROM public.interview_bookings WHERE applicant_id = v_applicant;

  RETURN coalesce((
    SELECT jsonb_agg(
      jsonb_build_object(
        'start_at', av.start_at,
        'pair_id', p.id,
        'location', coalesce(nullif(btrim(av.location), ''), public.interview_hour_location(av.start_at)),
        'interviewers', jsonb_build_array(
          public.admin_display_name(p.member_a),
          public.admin_display_name(p.member_b)
        )
      )
      ORDER BY av.start_at, p.id
    )
    FROM public.interview_availability av
    JOIN public.interview_pairs p ON p.id = av.pair_id AND p.status = 'active'
    JOIN public.admin_whitelist wa ON wa.id = p.member_a AND wa.is_active = true
    JOIN public.admin_whitelist wb ON wb.id = p.member_b AND wb.is_active = true
    WHERE av.start_at > now()
      AND NOT EXISTS (
        SELECT 1 FROM public.interview_bookings b
        WHERE b.pair_id = p.id AND b.start_at = av.start_at
          AND b.id IS DISTINCT FROM v_booking
      )
  ), '[]'::jsonb);
END;
$$;

DROP FUNCTION IF EXISTS public.book_interview_slot(timestamptz);

CREATE OR REPLACE FUNCTION public.book_interview_slot(p_start_at timestamptz, p_pair_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_applicant uuid := public.current_submitted_applicant_id();
  v_booking public.interview_bookings%ROWTYPE;
  v_pick record;
  v_location text;
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
    SELECT p.id AS pair_id, p.member_a, p.member_b, nullif(btrim(av.location), '') AS location
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

  v_location := coalesce(v_pick.location, public.interview_hour_location(p_start_at));

  IF v_booking.id IS NULL THEN
    INSERT INTO public.interview_bookings (applicant_id, pair_id, interviewer_ids, start_at, location)
    VALUES (v_applicant, v_pick.pair_id, ARRAY[v_pick.member_a, v_pick.member_b], p_start_at, v_location);
  ELSE
    UPDATE public.interview_bookings
    SET pair_id = v_pick.pair_id,
        interviewer_ids = ARRAY[v_pick.member_a, v_pick.member_b],
        start_at = p_start_at,
        location = v_location,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_booking.id;
  END IF;

  RETURN public.get_my_interview_booking();
END;
$$;

REVOKE ALL ON FUNCTION public.book_interview_slot(timestamptz, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.book_interview_slot(timestamptz, uuid) TO authenticated;
