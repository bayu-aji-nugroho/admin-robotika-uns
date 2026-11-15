-- Ringkasan Gabungan (halaman Jadwal Wawancara): jumlah calon anggota yang sudah mengirim
-- formulir, dibagi yang sudah / belum memilih jadwal wawancara. Hanya angka, tanpa data pribadi,
-- sehingga boleh dilihat semua admin aktif (termasuk pewawancara tanpa izin lihat pendaftar).
-- Calon yang belum menyelesaikan formulir (draft) tidak dihitung.

CREATE OR REPLACE FUNCTION public.get_interview_booking_counts()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'submitted', count(*),
      'booked', count(*) FILTER (WHERE b.applicant_id IS NOT NULL),
      'not_booked', count(*) FILTER (WHERE b.applicant_id IS NULL)
    )
    FROM public.applicants a
    LEFT JOIN public.interview_bookings b ON b.applicant_id = a.id
    WHERE a.submitted_at IS NOT NULL
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_interview_booking_counts() FROM public;
GRANT EXECUTE ON FUNCTION public.get_interview_booking_counts() TO authenticated;
