-- Sesi wawancara boleh ditandai selesai sebelum jam mulainya
-- (wawancara sering dilakukan lebih awal bila calon anggota datang lebih cepat).
-- Konfirmasi "jam sesi belum tiba" ditampilkan di dashboard.

CREATE OR REPLACE FUNCTION public.set_interview_completed(p_booking uuid, p_done boolean)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := public.current_admin_id();
  v_booking public.interview_bookings%ROWTYPE;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  SELECT * INTO v_booking FROM public.interview_bookings WHERE id = p_booking;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sesi wawancara tidak ditemukan.';
  END IF;

  IF NOT (v_me = ANY (v_booking.interviewer_ids)) AND NOT public.has_admin_permission('interview.sessions') THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya pewawancara sesi ini atau pengelola sesi wawancara yang dapat menandai selesai.';
  END IF;

  UPDATE public.interview_bookings
  SET completed_at = CASE WHEN p_done THEN timezone('utc'::text, now()) ELSE NULL END,
      completed_by = CASE WHEN p_done THEN v_me ELSE NULL END,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_booking;

  RETURN CASE WHEN p_done THEN now() ELSE NULL END;
END;
$$;
