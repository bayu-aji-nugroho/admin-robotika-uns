-- Bagian Guide yang disematkan superadmin (tampil paling atas untuk semua admin), urut sesuai waktu disematkan.
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS pinned_guide_sections text[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.set_guide_pin(p_section text, p_pinned boolean)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_section text := btrim(coalesce(p_section, ''));
  v_result text[];
BEGIN
  IF NOT public.is_admin_superuser() THEN
    RAISE EXCEPTION 'Akses ditolak: hanya superadmin yang bisa menyematkan Guide.';
  END IF;
  IF v_section !~ '^[a-z0-9-]{1,40}$' THEN
    RAISE EXCEPTION 'Bagian Guide tidak valid.';
  END IF;

  UPDATE public.admin_settings
  SET pinned_guide_sections = CASE
        WHEN p_pinned THEN array_append(array_remove(pinned_guide_sections, v_section), v_section)
        ELSE array_remove(pinned_guide_sections, v_section)
      END
  WHERE id = 1
  RETURNING pinned_guide_sections INTO v_result;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.set_guide_pin(text, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_guide_pin(text, boolean) TO authenticated;
