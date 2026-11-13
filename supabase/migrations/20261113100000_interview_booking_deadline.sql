-- Batas pemilihan jadwal wawancara (diatur di Pengaturan OPREC).
-- Setelah batas lewat calon anggota tidak bisa lagi memilih, mengganti, atau membatalkan jadwal.
-- Jadwal yang sudah dipilih tetap tersimpan dan masih bisa di-Accept (tidak mengubah jam).
-- NULL = tanpa batas.

ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS interview_booking_deadline timestamptz;

CREATE OR REPLACE FUNCTION public.is_interview_booking_open()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(
    (SELECT s.interview_booking_deadline IS NULL OR now() < s.interview_booking_deadline
     FROM public.admin_settings s WHERE s.id = 1),
    true
  );
$$;
REVOKE ALL ON FUNCTION public.is_interview_booking_open() FROM public;
GRANT EXECUTE ON FUNCTION public.is_interview_booking_open() TO anon, authenticated;

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

  IF NOT public.is_interview_booking_open() THEN
    RAISE EXCEPTION 'Batas pemilihan jadwal wawancara sudah lewat. Hubungi panitia OPREC bila ada kendala.';
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

CREATE OR REPLACE FUNCTION public.cancel_interview_booking()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_applicant uuid := public.current_submitted_applicant_id();
BEGIN
  IF v_applicant IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  IF NOT public.is_interview_booking_open() THEN
    RAISE EXCEPTION 'Batas pemilihan jadwal wawancara sudah lewat. Hubungi panitia OPREC bila ada kendala.';
  END IF;

  DELETE FROM public.interview_bookings WHERE applicant_id = v_applicant AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tidak ada jadwal yang dapat dibatalkan.';
  END IF;

  RETURN NULL;
END;
$$;

-- Versi lama (website sebelum slot ringkas): kosong setelah batas lewat
CREATE OR REPLACE FUNCTION public.get_interview_slots()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_compact jsonb;
BEGIN
  IF NOT public.is_interview_booking_open() THEN
    RETURN '[]'::jsonb;
  END IF;
  v_compact := public.get_interview_slots_compact();
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'start_at', to_timestamp((s.value->>1)::bigint),
      'pair_id', v_compact->'pairs'->((s.value->>0)::int)->>'id',
      'location', CASE WHEN s.value->>2 IS NULL THEN NULL ELSE v_compact->'locations'->>((s.value->>2)::int) END,
      'interviewers', v_compact->'pairs'->((s.value->>0)::int)->'interviewers'
    ) ORDER BY s.ordinality)
    FROM jsonb_array_elements(v_compact->'slots') WITH ORDINALITY AS s(value, ordinality)
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_interview_slots_compact()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_applicant uuid := public.current_submitted_applicant_id();
  v_booking uuid;
  v_result jsonb;
  v_deadline timestamptz := (SELECT interview_booking_deadline FROM public.admin_settings WHERE id = 1);
BEGIN
  IF v_applicant IS NULL OR NOT public.is_interview_booking_open() THEN
    RETURN jsonb_build_object(
      'pairs', '[]'::jsonb, 'locations', '[]'::jsonb, 'slots', '[]'::jsonb,
      'deadline', v_deadline, 'closed', NOT public.is_interview_booking_open()
    );
  END IF;

  SELECT id INTO v_booking FROM public.interview_bookings WHERE applicant_id = v_applicant;

  WITH s AS (
    SELECT p.id AS pair_id, p.member_a, p.member_b, av.start_at,
           nullif(btrim(av.location), '') AS loc
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
  ),
  -- Lokasi cadangan (interview_hour_location) cukup dihitung sekali per jam mulai, bukan per slot
  hour_loc AS (
    SELECT t.start_at, public.interview_hour_location(t.start_at) AS loc
    FROM (SELECT DISTINCT start_at FROM s WHERE loc IS NULL) t
  ),
  sl AS (
    SELECT s.pair_id, s.member_a, s.member_b, s.start_at, coalesce(s.loc, h.loc) AS loc
    FROM s LEFT JOIN hour_loc h ON h.start_at = s.start_at
  ),
  pr AS (
    SELECT x.pair_id, x.member_a, x.member_b, (row_number() OVER (ORDER BY x.pair_id) - 1)::int AS idx
    FROM (SELECT DISTINCT pair_id, member_a, member_b FROM sl) x
  ),
  lc AS (
    SELECT y.loc, (row_number() OVER (ORDER BY y.loc) - 1)::int AS idx
    FROM (SELECT DISTINCT loc FROM sl WHERE loc IS NOT NULL) y
  )
  SELECT jsonb_build_object(
    'pairs', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', pr.pair_id,
          'interviewers', jsonb_build_array(
            public.admin_display_name(pr.member_a),
            public.admin_display_name(pr.member_b)
          )
        ) ORDER BY pr.idx
      ) FROM pr
    ), '[]'::jsonb),
    'deadline', v_deadline,
    'closed', false,
    'locations', coalesce((SELECT jsonb_agg(lc.loc ORDER BY lc.idx) FROM lc), '[]'::jsonb),
    'slots', coalesce((
      SELECT jsonb_agg(
        jsonb_build_array(pr.idx, extract(epoch FROM sl.start_at)::bigint, lc.idx)
        ORDER BY sl.start_at, pr.idx
      )
      FROM sl
      JOIN pr ON pr.pair_id = sl.pair_id
      LEFT JOIN lc ON lc.loc = sl.loc
    ), '[]'::jsonb)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;
