-- Daftar slot wawancara untuk calon anggota dalam format RINGKAS.
-- get_interview_slots() mengulang nama pewawancara + lokasi di setiap slot (worst case 20
-- pewawancara x 14 hari penuh = 3.920 slot = ±660 KB per calon anggota). Versi ini mengirim
-- nama pasangan & lokasi sekali saja:
--   { pairs: [{id, interviewers}], locations: [text], slots: [[pair_idx, epoch_detik, loc_idx|null]] }
-- get_interview_slots() lama dipertahankan untuk kompatibilitas website versi sebelumnya.

CREATE OR REPLACE FUNCTION public.get_interview_slots_compact()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_applicant uuid := public.current_submitted_applicant_id();
  v_booking uuid;
  v_result jsonb;
BEGIN
  IF v_applicant IS NULL THEN
    RETURN jsonb_build_object('pairs', '[]'::jsonb, 'locations', '[]'::jsonb, 'slots', '[]'::jsonb);
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

REVOKE ALL ON FUNCTION public.get_interview_slots_compact() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_interview_slots_compact() TO authenticated;
