-- Fitur Acara Divisi & Data Tiket QR Presensi
-- * Admin / Superadmin (izin 'events.manage') dapat membuat & mengelola acara per divisi.
-- * Saat acara dibuat, sistem otomatis membuat 1 baris tiket + qr_token acak di event_attendances
--   untuk setiap calon anggota sesuai cakupan (accepted / registered_p1 / registered_all).
-- * Web Peserta membaca event_attendances milik peserta untuk men-generate QR Code.
-- * Web Admin memindai QR Code via kamera dan memanggil check_in_event_qr().

-- 1. Tambah permission 'events.manage' ke constraint admin_roles & role admin/developer
ALTER TABLE public.admin_roles DROP CONSTRAINT IF EXISTS admin_roles_permissions_known;
ALTER TABLE public.admin_roles ADD CONSTRAINT admin_roles_permissions_known CHECK (
  permissions <@ ARRAY[
    'applicants.view', 'applicants.assess', 'applicants.delete', 'oprec.settings',
    'interview.manage', 'interview.schedule', 'interview.sessions', 'announcements.send',
    'events.manage', 'viewer.readonly'
  ]::text[]
);

UPDATE public.admin_roles
SET permissions = array_append(permissions, 'events.manage')
WHERE lower(name) IN ('admin', 'developer')
  AND NOT ('events.manage' = ANY (permissions));

-- 2. Tabel acara divisi
CREATE TABLE IF NOT EXISTS public.division_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(btrim(title)) >= 2),
  description text,
  division_id varchar NOT NULL REFERENCES public.divisions(id) ON DELETE RESTRICT,
  target_scope text NOT NULL DEFAULT 'accepted'
    CHECK (target_scope IN ('accepted', 'registered_p1', 'registered_all')),
  event_date timestamptz NOT NULL,
  end_date timestamptz,
  location text,
  is_active boolean NOT NULL DEFAULT true,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_division_events_division ON public.division_events(division_id);
CREATE INDEX IF NOT EXISTS idx_division_events_date ON public.division_events(event_date DESC);

-- 3. Tabel tiket & kehadiran peserta per acara
CREATE TABLE IF NOT EXISTS public.event_attendances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.division_events(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  qr_token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'present', 'excused')),
  checked_in_at timestamptz,
  checked_in_by text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (event_id, applicant_id)
);

CREATE INDEX IF NOT EXISTS idx_event_attendances_event ON public.event_attendances(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendances_applicant ON public.event_attendances(applicant_id);
CREATE INDEX IF NOT EXISTS idx_event_attendances_token ON public.event_attendances(qr_token);

-- 4. RLS Policies
ALTER TABLE public.division_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "division_events_select" ON public.division_events;
CREATE POLICY "division_events_select" ON public.division_events
FOR SELECT TO authenticated
USING (
  public.has_admin_permission('applicants.view')
  OR EXISTS (
    SELECT 1
    FROM public.event_attendances ea
    JOIN public.applicants a ON a.id = ea.applicant_id
    WHERE ea.event_id = division_events.id
      AND a.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "division_events_manage" ON public.division_events;
CREATE POLICY "division_events_manage" ON public.division_events
FOR ALL TO authenticated
USING (public.has_admin_permission('events.manage'))
WITH CHECK (public.has_admin_permission('events.manage'));

DROP POLICY IF EXISTS "event_attendances_select" ON public.event_attendances;
CREATE POLICY "event_attendances_select" ON public.event_attendances
FOR SELECT TO authenticated
USING (
  public.has_admin_permission('applicants.view')
  OR EXISTS (
    SELECT 1
    FROM public.applicants a
    WHERE a.id = event_attendances.applicant_id
      AND a.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "event_attendances_manage" ON public.event_attendances;
CREATE POLICY "event_attendances_manage" ON public.event_attendances
FOR ALL TO authenticated
USING (public.has_admin_permission('events.manage'))
WITH CHECK (public.has_admin_permission('events.manage'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.division_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_attendances TO authenticated;

-- 5. Helper internal: generate tiket peserta untuk 1 acara sesuai target_scope
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
  IF p_target_scope = 'accepted' THEN
    INSERT INTO public.event_attendances (event_id, applicant_id)
    SELECT p_event_id, s.applicant_id
    FROM public.assessments s
    WHERE s.accepted_division_id = p_division_id
      AND lower(coalesce(s.status, '')) IN ('diterima', 'accepted', 'lolos', 'acc')
    ON CONFLICT (event_id, applicant_id) DO NOTHING;
  ELSIF p_target_scope = 'registered_p1' THEN
    INSERT INTO public.event_attendances (event_id, applicant_id)
    SELECT DISTINCT p_event_id, ad.applicant_id
    FROM public.applicant_divisions ad
    JOIN public.applicants a ON a.id = ad.applicant_id
    WHERE ad.division_id = p_division_id
      AND ad.priority = 1
      AND a.submitted_at IS NOT NULL
    ON CONFLICT (event_id, applicant_id) DO NOTHING;
  ELSE
    -- 'registered_all': Pilihan 1 maupun Pilihan 2 yang sudah submit
    INSERT INTO public.event_attendances (event_id, applicant_id)
    SELECT DISTINCT p_event_id, ad.applicant_id
    FROM public.applicant_divisions ad
    JOIN public.applicants a ON a.id = ad.applicant_id
    WHERE ad.division_id = p_division_id
      AND a.submitted_at IS NOT NULL
    ON CONFLICT (event_id, applicant_id) DO NOTHING;
  END IF;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

-- 6. RPC: Buat acara divisi sekaligus generate data tiket peserta
CREATE OR REPLACE FUNCTION public.create_division_event(
  p_title text,
  p_division_id varchar,
  p_event_date timestamptz,
  p_target_scope text DEFAULT 'accepted',
  p_description text DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_location text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_event_id uuid;
  v_tickets integer := 0;
BEGIN
  IF NOT public.has_admin_permission('events.manage') THEN
    RAISE EXCEPTION 'Akses ditolak: Role Anda tidak memiliki hak mengelola acara divisi.';
  END IF;

  IF char_length(btrim(coalesce(p_title, ''))) < 2 THEN
    RAISE EXCEPTION 'Judul acara minimal 2 karakter.';
  END IF;

  IF p_target_scope NOT IN ('accepted', 'registered_p1', 'registered_all') THEN
    RAISE EXCEPTION 'Cakupan peserta tidak valid.';
  END IF;

  INSERT INTO public.division_events (
    title, description, division_id, target_scope,
    event_date, end_date, location, created_by
  )
  VALUES (
    btrim(p_title),
    nullif(btrim(coalesce(p_description, '')), ''),
    p_division_id,
    p_target_scope,
    p_event_date,
    p_end_date,
    nullif(btrim(coalesce(p_location, '')), ''),
    v_email
  )
  RETURNING id INTO v_event_id;

  v_tickets := public._populate_event_attendances(v_event_id, p_division_id, p_target_scope);

  RETURN jsonb_build_object(
    'event_id', v_event_id,
    'tickets_created', v_tickets
  );
END;
$$;

-- 7. RPC: Sinkronkan anggota divisi yang baru diterima/mendaftar setelah acara dibuat
CREATE OR REPLACE FUNCTION public.sync_event_attendees(p_event_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_event record;
BEGIN
  IF NOT public.has_admin_permission('events.manage') THEN
    RAISE EXCEPTION 'Akses ditolak: Role Anda tidak memiliki hak mengelola acara divisi.';
  END IF;

  SELECT id, division_id, target_scope INTO v_event
  FROM public.division_events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Acara tidak ditemukan.';
  END IF;

  RETURN public._populate_event_attendances(v_event.id, v_event.division_id, v_event.target_scope);
END;
$$;

-- 8. RPC: Validasi & Check-in QR Code dari kamera admin
CREATE OR REPLACE FUNCTION public.check_in_event_qr(
  p_event_id uuid,
  p_qr_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_clean_token text := btrim(coalesce(p_qr_token, ''));
  v_row record;
  v_now timestamptz := timezone('utc'::text, now());
BEGIN
  IF NOT public.has_admin_permission('events.manage') THEN
    RAISE EXCEPTION 'Akses ditolak: Role Anda tidak memiliki hak memindai kehadiran acara.';
  END IF;

  IF v_clean_token = '' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'QR token kosong.');
  END IF;

  SELECT
    ea.id,
    ea.status,
    ea.checked_in_at,
    a.full_name,
    a.nim,
    a.prodi
  INTO v_row
  FROM public.event_attendances ea
  JOIN public.applicants a ON a.id = ea.applicant_id
  WHERE ea.event_id = p_event_id
    AND ea.qr_token = v_clean_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'not_found',
      'message', 'QR Code tidak terdaftar pada acara ini.'
    );
  END IF;

  IF v_row.status = 'present' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'already_present',
      'checked_in_at', v_row.checked_in_at,
      'applicant', jsonb_build_object(
        'full_name', v_row.full_name,
        'nim', v_row.nim,
        'prodi', v_row.prodi
      ),
      'message', 'Peserta sudah tercatat hadir sebelumnya.'
    );
  END IF;

  UPDATE public.event_attendances
  SET status = 'present',
      checked_in_at = v_now,
      checked_in_by = v_email
  WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'checked_in',
    'checked_in_at', v_now,
    'applicant', jsonb_build_object(
      'full_name', v_row.full_name,
      'nim', v_row.nim,
      'prodi', v_row.prodi
    ),
    'message', 'Kehadiran berhasil dicatat.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public._populate_event_attendances(uuid, varchar, text) FROM public;
REVOKE ALL ON FUNCTION public.create_division_event(text, varchar, timestamptz, text, text, timestamptz, text) FROM public;
REVOKE ALL ON FUNCTION public.sync_event_attendees(uuid) FROM public;
REVOKE ALL ON FUNCTION public.check_in_event_qr(uuid, text) FROM public;

GRANT EXECUTE ON FUNCTION public.create_division_event(text, varchar, timestamptz, text, text, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_event_attendees(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_event_qr(uuid, text) TO authenticated;

