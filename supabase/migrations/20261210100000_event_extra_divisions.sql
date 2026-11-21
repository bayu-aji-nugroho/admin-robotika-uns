-- Acara gabungan: satu acara bisa untuk sampai 3 divisi (divisi utama + maks 2 divisi tambahan),
-- mis. Werkudara Elektronika + Mekanika + Pemrograman. Acara divisi tunggal tetap seperti biasa.
ALTER TABLE public.division_events
  ADD COLUMN IF NOT EXISTS extra_division_ids varchar[] NOT NULL DEFAULT '{}';
ALTER TABLE public.division_events
  ADD CONSTRAINT division_events_extra_divisions_max CHECK (
    cardinality(extra_division_ids) <= 2
    AND (division_id IS NOT NULL OR cardinality(extra_division_ids) = 0)
  );
CREATE INDEX IF NOT EXISTS division_events_extra_division_ids_idx
  ON public.division_events USING gin (extra_division_ids);

-- Peserta acara bercakupan ikut divisi tambahan
CREATE OR REPLACE FUNCTION public._populate_event_attendances(p_event_id uuid, p_division_id character varying, p_target_scope text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_inserted integer := 0;
  v_divs varchar[];
BEGIN
  IF p_target_scope = 'open' THEN
    RETURN 0;
  END IF;

  -- NULL = Semua Divisi; selain itu divisi utama + divisi tambahan
  IF p_division_id IS NOT NULL THEN
    SELECT array_append(coalesce(extra_division_ids, '{}'), p_division_id) INTO v_divs
    FROM public.division_events WHERE id = p_event_id;
    v_divs := coalesce(v_divs, ARRAY[p_division_id]);
  END IF;

  IF p_target_scope = 'accepted' THEN
    INSERT INTO public.event_attendances (event_id, applicant_id)
    SELECT p_event_id, s.applicant_id
    FROM public.assessments s
    WHERE (v_divs IS NULL OR s.accepted_division_id = ANY (v_divs))
      AND lower(coalesce(s.status, '')) IN ('diterima', 'accepted', 'lolos', 'acc')
    ON CONFLICT (event_id, applicant_id) DO NOTHING;
  ELSIF p_target_scope = 'registered_p1' THEN
    INSERT INTO public.event_attendances (event_id, applicant_id)
    SELECT DISTINCT p_event_id, ad.applicant_id
    FROM public.applicant_divisions ad
    JOIN public.applicants a ON a.id = ad.applicant_id
    WHERE (v_divs IS NULL OR ad.division_id = ANY (v_divs))
      AND ad.priority = 1
      AND a.submitted_at IS NOT NULL
    ON CONFLICT (event_id, applicant_id) DO NOTHING;
  ELSE
    INSERT INTO public.event_attendances (event_id, applicant_id)
    SELECT DISTINCT p_event_id, ad.applicant_id
    FROM public.applicant_divisions ad
    JOIN public.applicants a ON a.id = ad.applicant_id
    WHERE (v_divs IS NULL OR ad.division_id = ANY (v_divs))
      AND a.submitted_at IS NOT NULL
    ON CONFLICT (event_id, applicant_id) DO NOTHING;
  END IF;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

-- Buat acara dengan divisi tambahan (parameter baru di akhir, default kosong)
DROP FUNCTION IF EXISTS public.create_division_event(text, character varying, timestamptz, text, text, timestamptz, text);
CREATE OR REPLACE FUNCTION public.create_division_event(
  p_title text,
  p_division_id character varying,
  p_event_date timestamptz,
  p_target_scope text DEFAULT 'open',
  p_description text DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_extra_division_ids varchar[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_event_id uuid;
  v_tickets integer := 0;
  v_extra varchar[];
BEGIN
  IF NOT public.has_admin_permission('events.manage') THEN
    RAISE EXCEPTION 'Akses ditolak: Role Anda tidak memiliki hak mengelola acara divisi.';
  END IF;

  IF char_length(btrim(coalesce(p_title, ''))) < 2 THEN
    RAISE EXCEPTION 'Judul acara minimal 2 karakter.';
  END IF;

  IF p_target_scope NOT IN ('open', 'accepted', 'registered_p1', 'registered_all') THEN
    RAISE EXCEPTION 'Cakupan peserta tidak valid.';
  END IF;

  -- Divisi tambahan: unik, bukan divisi utama, harus divisi yang ada; Semua Divisi tidak punya tambahan
  IF p_division_id IS NOT NULL THEN
    SELECT coalesce(array_agg(DISTINCT x), '{}') INTO v_extra
    FROM unnest(coalesce(p_extra_division_ids, '{}')) x
    WHERE x <> p_division_id AND EXISTS (SELECT 1 FROM public.divisions d WHERE d.id = x);
  ELSE
    v_extra := '{}';
  END IF;
  IF cardinality(v_extra) > 2 THEN
    RAISE EXCEPTION 'Maksimal 3 divisi per acara.';
  END IF;

  INSERT INTO public.division_events (
    title, description, division_id, extra_division_ids, target_scope,
    event_date, end_date, location, created_by
  )
  VALUES (
    btrim(p_title),
    nullif(btrim(coalesce(p_description, '')), ''),
    p_division_id,
    v_extra,
    p_target_scope,
    p_event_date,
    p_end_date,
    nullif(btrim(coalesce(p_location, '')), ''),
    v_email
  )
  RETURNING id INTO v_event_id;

  v_tickets := public._populate_event_attendances(v_event_id, p_division_id, p_target_scope);

  RETURN jsonb_build_object('event_id', v_event_id, 'tickets_created', v_tickets);
END;
$$;
REVOKE ALL ON FUNCTION public.create_division_event(text, character varying, timestamptz, text, text, timestamptz, text, varchar[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_division_event(text, character varying, timestamptz, text, text, timestamptz, text, varchar[]) TO authenticated;

-- Riwayat pertemuan calon: acara gabungan ikut tampil untuk divisi tambahan
CREATE OR REPLACE FUNCTION public.get_my_meeting_history()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_applicant uuid;
  v_division varchar;
  v_meetings jsonb;
BEGIN
  SELECT id INTO v_applicant FROM public.applicants WHERE user_id = auth.uid() AND status = 'submitted';
  IF v_applicant IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT division_id INTO v_division FROM public.applicant_divisions
  WHERE applicant_id = v_applicant AND priority = 1 LIMIT 1;

  SELECT coalesce(jsonb_agg(m ORDER BY m->>'at' DESC), '[]'::jsonb) INTO v_meetings
  FROM (
    SELECT jsonb_build_object(
        'title', e.title, 'at', e.event_date, 'location', e.location,
        'status', CASE WHEN a.status IS NULL OR a.status = 'pending' THEN 'absent' ELSE a.status END) AS m
    FROM public.division_events e
    LEFT JOIN public.event_attendances a ON a.event_id = e.id AND a.applicant_id = v_applicant
    WHERE e.is_active AND e.event_date <= now()
      AND (e.division_id IS NULL OR e.division_id = v_division OR v_division = ANY (e.extra_division_ids)
           OR a.id IS NOT NULL)
  ) q;

  RETURN jsonb_build_object(
    'meetings', v_meetings,
    'contact_name', (SELECT full_name FROM public.admin_whitelist WHERE email = 'dwikurnia12@student.uns.ac.id'),
    'contact_whatsapp', (SELECT interview_whatsapp FROM public.admin_whitelist WHERE email = 'dwikurnia12@student.uns.ac.id')
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_meeting_history() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_meeting_history() TO authenticated;
