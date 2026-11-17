-- Bintang untuk calon anggota potensial. Dibagikan ke semua admin (terlihat siapa yang
-- memberi bintang). Semua admin aktif (termasuk pewawancara) boleh memberi/mencabut,
-- kecuali role Viewer (hanya lihat).

-- Admin aktif yang bukan role Viewer (superadmin selalu lolos)
CREATE OR REPLACE FUNCTION public.is_active_non_viewer_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_whitelist aw
    LEFT JOIN public.admin_roles r ON r.id = aw.role_id
    WHERE lower(aw.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND aw.is_active = true
      AND (aw.is_superadmin = true OR NOT ('viewer.readonly' = ANY (coalesce(r.permissions, '{}'))))
  );
$$;
CREATE TABLE IF NOT EXISTS public.applicant_stars (
  applicant_id uuid PRIMARY KEY REFERENCES public.applicants(id) ON DELETE CASCADE,
  starred_by uuid REFERENCES public.admin_whitelist(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.applicant_stars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS applicant_stars_admin_select ON public.applicant_stars;
CREATE POLICY applicant_stars_admin_select ON public.applicant_stars
  FOR SELECT TO authenticated
  USING (public.is_active_admin());

REVOKE ALL ON public.applicant_stars FROM anon, authenticated;
GRANT SELECT ON public.applicant_stars TO authenticated;

-- Perubahan hanya lewat RPC
CREATE OR REPLACE FUNCTION public.set_applicant_star(p_applicant uuid, p_starred boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin uuid := public.current_admin_id();
BEGIN
  IF v_admin IS NULL OR NOT public.is_active_non_viewer_admin() THEN
    RAISE EXCEPTION 'Akses ditolak: role Viewer hanya dapat melihat.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.applicants WHERE id = p_applicant) THEN
    RAISE EXCEPTION 'Data pendaftar tidak ditemukan.';
  END IF;

  IF p_starred THEN
    INSERT INTO public.applicant_stars (applicant_id, starred_by)
    VALUES (p_applicant, v_admin)
    ON CONFLICT (applicant_id) DO NOTHING;
  ELSE
    DELETE FROM public.applicant_stars WHERE applicant_id = p_applicant;
  END IF;

  RETURN jsonb_build_object(
    'starred', p_starred,
    'starred_by_name', CASE WHEN p_starred THEN
      (SELECT public.admin_display_name(s.starred_by) FROM public.applicant_stars s WHERE s.applicant_id = p_applicant)
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_applicant_star(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_applicant_star(uuid, boolean) TO authenticated;
