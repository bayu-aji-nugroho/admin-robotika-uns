-- Mengalihkan sesi wawancara ke pasangan pewawancara lain di jam yang sama (mis. pewawancara
-- berhalangan mendadak). Pasangan tujuan harus aktif, kedua anggotanya aktif, jam itu ada di
-- kalender kedua anggotanya (view interview_availability) dan belum dipesan calon lain.
-- Konfirmasi ke pewawancara tujuan dilakukan di luar sistem (pop-up wajib di dashboard).
-- Status konfirmasi & lokasi tetap; calon anggota langsung melihat pewawancara baru di website.

CREATE OR REPLACE FUNCTION public.transfer_interview_booking(p_booking uuid, p_pair uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := public.current_admin_id();
  v_booking public.interview_bookings%ROWTYPE;
  v_pair record;
  v_applicant record;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  SELECT * INTO v_booking FROM public.interview_bookings WHERE id = p_booking;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesi wawancara tidak ditemukan.';
  END IF;

  IF NOT (v_me = ANY (v_booking.interviewer_ids)) AND NOT public.has_admin_permission('interview.sessions') THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya pewawancara sesi ini atau pengelola sesi wawancara yang dapat mengalihkan sesi.';
  END IF;

  IF v_booking.completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Sesi sudah ditandai selesai, tidak bisa dialihkan.';
  END IF;

  IF v_booking.start_at <= now() THEN
    RAISE EXCEPTION 'Jam sesi sudah lewat, tidak bisa dialihkan.';
  END IF;

  IF p_pair IS NULL OR p_pair IS NOT DISTINCT FROM v_booking.pair_id THEN
    RAISE EXCEPTION 'Pilih pasangan pewawancara lain.';
  END IF;

  SELECT p.id, p.member_a, p.member_b INTO v_pair
  FROM public.interview_pairs p
  JOIN public.admin_whitelist wa ON wa.id = p.member_a AND wa.is_active = true
  JOIN public.admin_whitelist wb ON wb.id = p.member_b AND wb.is_active = true
  WHERE p.id = p_pair AND p.status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pasangan pewawancara tujuan tidak aktif.';
  END IF;

  -- Kunci yang sama dengan book_interview_slot agar tidak bentrok dengan calon yang sedang memesan
  PERFORM pg_advisory_xact_lock(hashtext('interview_slot:' || v_booking.start_at::text));

  IF NOT EXISTS (
    SELECT 1 FROM public.interview_availability av
    WHERE av.pair_id = v_pair.id AND av.start_at = v_booking.start_at
  ) THEN
    RAISE EXCEPTION 'Jam ini belum ada di kalender kedua pewawancara tujuan. Minta mereka mengisinya dulu.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.interview_bookings b
    WHERE b.pair_id = v_pair.id AND b.start_at = v_booking.start_at AND b.id <> v_booking.id
  ) THEN
    RAISE EXCEPTION 'Pewawancara tujuan sudah punya sesi lain di jam ini.';
  END IF;

  UPDATE public.interview_bookings
  SET pair_id = v_pair.id,
      interviewer_ids = ARRAY[v_pair.member_a, v_pair.member_b],
      updated_at = timezone('utc'::text, now())
  WHERE id = v_booking.id;

  SELECT a.full_name, a.whatsapp INTO v_applicant FROM public.applicants a WHERE a.id = v_booking.applicant_id;

  RETURN jsonb_build_object(
    'start_at', v_booking.start_at,
    'interviewers', jsonb_build_array(public.admin_display_name(v_pair.member_a), public.admin_display_name(v_pair.member_b)),
    'applicant_name', v_applicant.full_name,
    'applicant_whatsapp', v_applicant.whatsapp
  );
END;
$$;
REVOKE ALL ON FUNCTION public.transfer_interview_booking(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.transfer_interview_booking(uuid, uuid) TO authenticated;
