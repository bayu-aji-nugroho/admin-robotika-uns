-- Data halaman /dashboard/jadwal dalam SATU panggilan dan SATU nilai jsonb, sehingga tidak
-- terpotong batas max-rows PostgREST (default 1000) walau 20+ pewawancara mengisi penuh.
-- Rentang: 1 jam lalu (sesi yang sedang berlangsung) s.d. 60 hari ke depan.
-- Kalender pribadi dikirim ringkas per admin: [[epoch_detik, lokasi|null], ...].
-- Slot pasangan (irisan) dihitung di aplikasi dari kalender pribadi.

CREATE OR REPLACE FUNCTION public.get_schedule_dashboard()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_from timestamptz := now() - interval '1 hour';
  v_to timestamptz := now() + interval '60 days';
BEGIN
  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  RETURN jsonb_build_object(
    'from', v_from,
    'to', v_to,
    'member_availability', coalesce((
      SELECT jsonb_agg(jsonb_build_object('admin_id', g.admin_id, 'slots', g.slots))
      FROM (
        SELECT av.admin_id,
               jsonb_agg(
                 jsonb_build_array(extract(epoch FROM av.start_at)::bigint, nullif(btrim(av.location), ''))
                 ORDER BY av.start_at
               ) AS slots
        FROM public.interview_admin_availability av
        WHERE av.start_at >= v_from AND av.start_at < v_to
        GROUP BY av.admin_id
      ) g
    ), '[]'::jsonb),
    'bookings', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'pair_id', b.pair_id,
          'interviewer_ids', b.interviewer_ids,
          'start_at', b.start_at,
          'location', b.location,
          'status', b.status,
          'applicant_name', a.full_name,
          'applicant_nim', a.nim
        ) ORDER BY b.start_at
      )
      FROM public.interview_bookings b
      LEFT JOIN public.applicants a ON a.id = b.applicant_id
      WHERE b.start_at >= v_from
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_schedule_dashboard() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_schedule_dashboard() TO authenticated;
