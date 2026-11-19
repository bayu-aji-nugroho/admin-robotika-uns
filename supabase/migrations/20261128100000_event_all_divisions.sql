-- Acara untuk SEMUA divisi: division_id kosong (NULL). Cakupan peserta tetap berlaku,
-- hanya tanpa saringan divisi (mis. "Diterima" = diterima di divisi mana pun).
ALTER TABLE public.division_events ALTER COLUMN division_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public._populate_event_attendances(
  p_event_id uuid,
  p_division_id varchar,
  p_target_scope text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_inserted integer := 0;
BEGIN
  IF p_target_scope = 'open' THEN
    RETURN 0;
  ELSIF p_target_scope = 'accepted' THEN
    INSERT INTO public.event_attendances (event_id, applicant_id)
    SELECT p_event_id, s.applicant_id
    FROM public.assessments s
    WHERE (p_division_id IS NULL OR s.accepted_division_id = p_division_id)
      AND lower(coalesce(s.status, '')) IN ('diterima', 'accepted', 'lolos', 'acc')
    ON CONFLICT (event_id, applicant_id) DO NOTHING;
  ELSIF p_target_scope = 'registered_p1' THEN
    INSERT INTO public.event_attendances (event_id, applicant_id)
    SELECT DISTINCT p_event_id, ad.applicant_id
    FROM public.applicant_divisions ad
    JOIN public.applicants a ON a.id = ad.applicant_id
    WHERE (p_division_id IS NULL OR ad.division_id = p_division_id)
      AND ad.priority = 1
      AND a.submitted_at IS NOT NULL
    ON CONFLICT (event_id, applicant_id) DO NOTHING;
  ELSE
    INSERT INTO public.event_attendances (event_id, applicant_id)
    SELECT DISTINCT p_event_id, ad.applicant_id
    FROM public.applicant_divisions ad
    JOIN public.applicants a ON a.id = ad.applicant_id
    WHERE (p_division_id IS NULL OR ad.division_id = p_division_id)
      AND a.submitted_at IS NOT NULL
    ON CONFLICT (event_id, applicant_id) DO NOTHING;
  END IF;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;
