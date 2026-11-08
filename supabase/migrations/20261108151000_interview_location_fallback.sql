-- Lokasi sesi wawancara: pakai lokasi dari 2 pewawancara terpilih; bila keduanya
-- tidak mengisi, pakai lokasi yang diisi admin lain pada jam yang sama.

CREATE OR REPLACE FUNCTION public.interview_hour_location(p_start_at timestamptz)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT av.location FROM public.interview_availability av
  WHERE av.start_at = p_start_at AND nullif(btrim(av.location), '') IS NOT NULL
  ORDER BY av.created_at ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.interview_hour_location(timestamptz) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_interview_slots()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_applicant uuid := public.current_submitted_applicant_id();
  v_booking uuid;
  v_slots jsonb := '[]'::jsonb;
  v_hour timestamptz;
  v_names jsonb;
  v_location text;
  v_count int;
BEGIN
  IF v_applicant IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT id INTO v_booking FROM public.interview_bookings WHERE applicant_id = v_applicant;

  FOR v_hour IN
    SELECT DISTINCT av.start_at FROM public.interview_availability av
    WHERE av.start_at > now()
    ORDER BY av.start_at
  LOOP
    SELECT count(*), jsonb_agg(p.display_name), max(nullif(btrim(p.location), ''))
    INTO v_count, v_names, v_location
    FROM public.pick_interview_pair(v_hour, v_booking) p;

    IF v_count >= 2 THEN
      v_slots := v_slots || jsonb_build_object(
        'start_at', v_hour,
        'location', coalesce(v_location, public.interview_hour_location(v_hour)),
        'interviewers', v_names
      );
    END IF;
  END LOOP;

  RETURN v_slots;
END;
$$;

CREATE OR REPLACE FUNCTION public.book_interview_slot(p_start_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_applicant uuid := public.current_submitted_applicant_id();
  v_booking public.interview_bookings%ROWTYPE;
  v_pair record;
  v_ids uuid[] := '{}';
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

  FOR v_pair IN SELECT * FROM public.pick_interview_pair(p_start_at, v_booking.id) LOOP
    v_ids := v_ids || v_pair.admin_id;
    v_location := coalesce(v_location, nullif(btrim(v_pair.location), ''));
  END LOOP;

  IF coalesce(array_length(v_ids, 1), 0) < 2 THEN
    RAISE EXCEPTION 'Jadwal ini sudah penuh. Silakan pilih jadwal lain.';
  END IF;

  v_location := coalesce(v_location, public.interview_hour_location(p_start_at));

  IF v_booking.id IS NULL THEN
    INSERT INTO public.interview_bookings (applicant_id, start_at, location)
    VALUES (v_applicant, p_start_at, v_location)
    RETURNING * INTO v_booking;
  ELSE
    UPDATE public.interview_bookings
    SET start_at = p_start_at, location = v_location, updated_at = timezone('utc'::text, now())
    WHERE id = v_booking.id
    RETURNING * INTO v_booking;

    DELETE FROM public.interview_booking_interviewers WHERE booking_id = v_booking.id;
  END IF;

  INSERT INTO public.interview_booking_interviewers (booking_id, admin_id, start_at)
  SELECT v_booking.id, unnest(v_ids), p_start_at;

  RETURN public.get_my_interview_booking();
END;
$$;
