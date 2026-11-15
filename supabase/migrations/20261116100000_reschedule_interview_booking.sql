-- Pewawancara (atau pengelola semua sesi) memindahkan jam sesi wawancara, untuk antisipasi
-- perubahan jadwal mendadak. Jam baru harus slot kosong di kalender KEDUA anggota pasangan
-- sesi itu (view interview_availability) dan belum dipesan calon lain. Status konfirmasi
-- & lokasi tetap; calon anggota langsung melihat jam baru di website.

CREATE OR REPLACE FUNCTION public.reschedule_interview_booking(p_booking uuid, p_start_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := public.current_admin_id();
  v_booking public.interview_bookings%ROWTYPE;
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
    RAISE EXCEPTION 'Akses ditolak: Hanya pewawancara sesi ini atau pengelola sesi wawancara yang dapat mengubah jam.';
  END IF;

  IF v_booking.completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Sesi sudah ditandai selesai, jamnya tidak bisa diubah.';
  END IF;

  IF v_booking.pair_id IS NULL THEN
    RAISE EXCEPTION 'Pasangan pewawancara sesi ini sudah tidak aktif.';
  END IF;

  IF p_start_at IS NULL OR p_start_at <= now() THEN
    RAISE EXCEPTION 'Jam baru harus di masa mendatang.';
  END IF;

  IF p_start_at <> v_booking.start_at THEN
    -- Kunci yang sama dengan book_interview_slot agar tidak bentrok dengan calon yang sedang memesan
    PERFORM pg_advisory_xact_lock(hashtext('interview_slot:' || p_start_at::text));

    IF NOT EXISTS (
      SELECT 1 FROM public.interview_availability av
      WHERE av.pair_id = v_booking.pair_id AND av.start_at = p_start_at
    ) THEN
      RAISE EXCEPTION 'Jam ini tidak ada di kalender kedua pewawancara. Isi dulu di Data & Kalender Saya.';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.interview_bookings b
      WHERE b.pair_id = v_booking.pair_id AND b.start_at = p_start_at AND b.id <> v_booking.id
    ) THEN
      RAISE EXCEPTION 'Jam ini sudah dipesan calon anggota lain. Pilih jam lain.';
    END IF;

    UPDATE public.interview_bookings
    SET start_at = p_start_at, updated_at = timezone('utc'::text, now())
    WHERE id = v_booking.id;
  END IF;

  SELECT a.full_name, a.whatsapp INTO v_applicant FROM public.applicants a WHERE a.id = v_booking.applicant_id;

  RETURN jsonb_build_object(
    'start_at', p_start_at,
    'applicant_name', v_applicant.full_name,
    'applicant_whatsapp', v_applicant.whatsapp
  );
END;
$$;
REVOKE ALL ON FUNCTION public.reschedule_interview_booking(uuid, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.reschedule_interview_booking(uuid, timestamptz) TO authenticated;
