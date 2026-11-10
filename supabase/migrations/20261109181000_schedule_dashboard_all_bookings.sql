-- Dashboard jadwal: tampilkan SEMUA booking (riwayat sesi selesai tetap terlihat).
-- Jumlah booking <= jumlah pendaftar (1 booking per pendaftar), jadi tetap kecil.
CREATE OR REPLACE FUNCTION public.get_schedule_dashboard()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_from timestamptz := now() - interval '1 hour';
  v_to timestamptz := now() + interval '60 days';
  v_result jsonb;
BEGIN
  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  WITH av AS (
    SELECT admin_id, start_at, nullif(btrim(location), '') AS loc
    FROM public.interview_admin_availability
    WHERE start_at >= v_from AND start_at < v_to
  ),
  lc AS (
    SELECT y.loc, (row_number() OVER (ORDER BY y.loc) - 1)::int AS idx
    FROM (SELECT DISTINCT loc FROM av WHERE loc IS NOT NULL) y
  ),
  grouped AS (
    SELECT av.admin_id,
           jsonb_agg(jsonb_build_array(extract(epoch FROM av.start_at)::bigint, lc.idx) ORDER BY av.start_at) AS slots
    FROM av LEFT JOIN lc ON lc.loc = av.loc
    GROUP BY av.admin_id
  )
  SELECT jsonb_build_object(
    'from', v_from,
    'to', v_to,
    'locations', coalesce((SELECT jsonb_agg(lc.loc ORDER BY lc.idx) FROM lc), '[]'::jsonb),
    'member_availability', coalesce((
      SELECT jsonb_agg(jsonb_build_object('admin_id', g.admin_id, 'slots', g.slots)) FROM grouped g
    ), '[]'::jsonb),
    'bookings', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'applicant_id', b.applicant_id,
          'pair_id', b.pair_id,
          'interviewer_ids', b.interviewer_ids,
          'start_at', b.start_at,
          'location', b.location,
          'status', b.status,
          'completed_at', b.completed_at,
          'applicant_name', a.full_name,
          'applicant_nim', a.nim
        ) ORDER BY b.start_at
      )
      FROM public.interview_bookings b
      LEFT JOIN public.applicants a ON a.id = b.applicant_id
    ), '[]'::jsonb)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_schedule_dashboard() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_schedule_dashboard() TO authenticated;
