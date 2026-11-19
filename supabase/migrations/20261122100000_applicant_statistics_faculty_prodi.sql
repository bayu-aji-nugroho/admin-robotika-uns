-- Perluas get_applicant_statistics() agar menyertakan agregat sebaran fakultas dan program studi (prodi).

CREATE OR REPLACE FUNCTION public.get_applicant_statistics()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_admin_permission('applicants.view') THEN
    RAISE EXCEPTION 'Akses ditolak: Role Anda tidak memiliki hak melihat pendaftar.';
  END IF;

  RETURN jsonb_build_object(
    'totals', (
      SELECT jsonb_build_object(
        'submitted', count(*) FILTER (WHERE a.submitted_at IS NOT NULL),
        'draft', count(*) FILTER (WHERE a.submitted_at IS NULL),
        'booked', (SELECT count(*) FROM public.interview_bookings),
        'interviewed', (SELECT count(*) FROM public.interview_bookings WHERE completed_at IS NOT NULL)
      )
      FROM public.applicants a
    ),
    'divisions', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', d.id,
        'name', d.name,
        'category', d.category,
        'p1_submitted', coalesce(c.p1_submitted, 0),
        'p2_submitted', coalesce(c.p2_submitted, 0),
        'p1_all', coalesce(c.p1_all, 0),
        'p2_all', coalesce(c.p2_all, 0)
      ) ORDER BY d.category, d.name)
      FROM public.divisions d
      LEFT JOIN (
        SELECT ad.division_id,
               count(*) FILTER (WHERE ad.priority = 1 AND a.submitted_at IS NOT NULL) AS p1_submitted,
               count(*) FILTER (WHERE ad.priority = 2 AND a.submitted_at IS NOT NULL) AS p2_submitted,
               count(*) FILTER (WHERE ad.priority = 1) AS p1_all,
               count(*) FILTER (WHERE ad.priority = 2) AS p2_all
        FROM public.applicant_divisions ad
        JOIN public.applicants a ON a.id = ad.applicant_id
        GROUP BY ad.division_id
      ) c ON c.division_id = d.id
      WHERE d.is_active OR c.division_id IS NOT NULL
    ), '[]'::jsonb),
    'faculties', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'name', f.name,
        'submitted', f.submitted,
        'all', f.all_count
      ) ORDER BY f.submitted DESC, f.all_count DESC, f.name ASC)
      FROM (
        SELECT coalesce(nullif(trim(a.fakultas), ''), 'Belum diisi') AS name,
               count(*) FILTER (WHERE a.submitted_at IS NOT NULL) AS submitted,
               count(*) AS all_count
        FROM public.applicants a
        GROUP BY 1
      ) f
    ), '[]'::jsonb),
    'prodis', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'name', p.name,
        'submitted', p.submitted,
        'all', p.all_count
      ) ORDER BY p.submitted DESC, p.all_count DESC, p.name ASC)
      FROM (
        SELECT coalesce(nullif(trim(a.prodi), ''), 'Belum diisi') AS name,
               count(*) FILTER (WHERE a.submitted_at IS NOT NULL) AS submitted,
               count(*) AS all_count
        FROM public.applicants a
        GROUP BY 1
      ) p
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_applicant_statistics() FROM public;
GRANT EXECUTE ON FUNCTION public.get_applicant_statistics() TO authenticated;
