-- =====================================================================
-- Jadwal Wawancara OPREC
-- ---------------------------------------------------------------------
-- * Admin (hak akses "interview.schedule") mengisi ketersediaan per jam
--   (blok 60 menit) beserta lokasi/link wawancara.
-- * Satu sesi = 1 calon anggota + 2 pewawancara. Sebuah jam bisa dipesan
--   bila ada minimal 2 admin yang tersedia dan belum terpakai di jam itu.
-- * Calon anggota (status submitted) memesan lewat RPC; sistem memasangkan
--   2 admin otomatis (yang paling sedikit jadwalnya). Selama "pending"
--   pesanan boleh diganti; setelah "accepted" terkunci permanen.
-- * Semua penulisan oleh calon anggota lewat fungsi SECURITY DEFINER,
--   tabel booking tidak bisa ditulis langsung dari client.
-- =====================================================================

-- 1. Hak akses baru: interview.schedule ---------------------------------
--    (harus sama dengan ADMIN_PERMISSIONS di utils/permissions.ts)
ALTER TABLE public.admin_roles DROP CONSTRAINT IF EXISTS admin_roles_permissions_known;
ALTER TABLE public.admin_roles ADD CONSTRAINT admin_roles_permissions_known CHECK (
  permissions <@ ARRAY[
    'applicants.view',
    'applicants.assess',
    'applicants.delete',
    'oprec.settings',
    'interview.manage',
    'interview.schedule'
  ]::text[]
);

-- Semua role yang sudah ada (seluruhnya role admin OPREC) ikut mendapat akses jadwal.
UPDATE public.admin_roles
SET permissions = array_append(permissions, 'interview.schedule')
WHERE NOT ('interview.schedule' = ANY (permissions));

-- 2. Tabel ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.interview_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.admin_whitelist(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  location text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT interview_availability_unique UNIQUE (admin_id, start_at),
  CONSTRAINT interview_availability_full_hour CHECK (
    extract(minute FROM start_at) = 0 AND extract(second FROM start_at) = 0
  ),
  CONSTRAINT interview_availability_location_length CHECK (
    location IS NULL OR char_length(location) <= 300
  )
);

CREATE INDEX IF NOT EXISTS interview_availability_start_idx
  ON public.interview_availability (start_at);

CREATE TABLE IF NOT EXISTS public.interview_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id uuid NOT NULL UNIQUE REFERENCES public.applicants(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  location text,
  status text NOT NULL DEFAULT 'pending',
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT interview_bookings_status_check CHECK (status IN ('pending', 'accepted'))
);

CREATE INDEX IF NOT EXISTS interview_bookings_start_idx
  ON public.interview_bookings (start_at);

CREATE TABLE IF NOT EXISTS public.interview_booking_interviewers (
  booking_id uuid NOT NULL REFERENCES public.interview_bookings(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES public.admin_whitelist(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  PRIMARY KEY (booking_id, admin_id),
  -- Seorang admin tidak bisa mewawancarai 2 orang di jam yang sama
  CONSTRAINT interview_booking_interviewers_admin_slot_unique UNIQUE (admin_id, start_at)
);

-- 3. Helper -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_admin_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT aw.id FROM public.admin_whitelist aw
  WHERE lower(aw.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    AND aw.is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_submitted_applicant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id FROM public.applicants a
  WHERE a.user_id = auth.uid() AND a.status = 'submitted'
  LIMIT 1;
$$;

-- Memilih 2 admin yang tersedia di jam tertentu, belum terpakai di jam itu
-- (kecuali oleh booking p_exclude_booking), urut dari yang paling sedikit jadwal.
CREATE OR REPLACE FUNCTION public.pick_interview_pair(
  p_start_at timestamptz,
  p_exclude_booking uuid DEFAULT NULL
)
RETURNS TABLE (admin_id uuid, display_name text, location text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    av.admin_id,
    coalesce(nullif(btrim(aw.full_name), ''), split_part(aw.email, '@', 1)) AS display_name,
    av.location
  FROM public.interview_availability av
  JOIN public.admin_whitelist aw ON aw.id = av.admin_id AND aw.is_active = true
  WHERE av.start_at = p_start_at
    AND NOT EXISTS (
      SELECT 1 FROM public.interview_booking_interviewers bi
      WHERE bi.admin_id = av.admin_id
        AND bi.start_at = p_start_at
        AND bi.booking_id IS DISTINCT FROM p_exclude_booking
    )
  ORDER BY
    (SELECT count(*) FROM public.interview_booking_interviewers bi2
      WHERE bi2.admin_id = av.admin_id
        AND bi2.booking_id IS DISTINCT FROM p_exclude_booking) ASC,
    av.created_at ASC,
    av.admin_id ASC
  LIMIT 2;
$$;

-- 4. RPC calon anggota ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_interview_booking()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_applicant uuid := public.current_submitted_applicant_id();
  v_result jsonb;
BEGIN
  IF v_applicant IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', b.id,
    'start_at', b.start_at,
    'location', b.location,
    'status', b.status,
    'accepted_at', b.accepted_at,
    'interviewers', coalesce((
      SELECT jsonb_agg(coalesce(nullif(btrim(aw.full_name), ''), split_part(aw.email, '@', 1)) ORDER BY aw.full_name)
      FROM public.interview_booking_interviewers bi
      JOIN public.admin_whitelist aw ON aw.id = bi.admin_id
      WHERE bi.booking_id = b.id
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM public.interview_bookings b
  WHERE b.applicant_id = v_applicant;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_interview_slots()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_applicant uuid := public.current_submitted_applicant_id();
  v_booking uuid;
  v_slots jsonb := '[]'::jsonb;
  v_hour timestamptz;
  v_names jsonb;
  v_location text;
  v_count int;
BEGIN
  IF v_applicant IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT id INTO v_booking FROM public.interview_bookings WHERE applicant_id = v_applicant;

  FOR v_hour IN
    SELECT DISTINCT av.start_at FROM public.interview_availability av
    WHERE av.start_at > now()
    ORDER BY av.start_at
  LOOP
    SELECT count(*), jsonb_agg(p.display_name), max(p.location)
    INTO v_count, v_names, v_location
    FROM public.pick_interview_pair(v_hour, v_booking) p;

    IF v_count >= 2 THEN
      v_slots := v_slots || jsonb_build_object(
        'start_at', v_hour,
        'location', v_location,
        'interviewers', v_names
      );
    END IF;
  END LOOP;

  RETURN v_slots;
END;
$$;

CREATE OR REPLACE FUNCTION public.book_interview_slot(p_start_at timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_applicant uuid := public.current_submitted_applicant_id();
  v_booking public.interview_bookings%ROWTYPE;
  v_pair record;
  v_ids uuid[] := '{}';
  v_location text;
BEGIN
  IF v_applicant IS NULL THEN
    RAISE EXCEPTION 'Hanya calon anggota yang sudah mengirim formulir yang dapat memilih jadwal wawancara.';
  END IF;

  IF p_start_at IS NULL OR p_start_at <= now() THEN
    RAISE EXCEPTION 'Jadwal yang dipilih sudah lewat. Silakan pilih jadwal lain.';
  END IF;

  -- Serialisasi pemesanan pada jam yang sama agar tidak terjadi bentrok
  PERFORM pg_advisory_xact_lock(hashtext('interview_slot:' || p_start_at::text));

  SELECT * INTO v_booking FROM public.interview_bookings
  WHERE applicant_id = v_applicant FOR UPDATE;

  IF FOUND AND v_booking.status = 'accepted' THEN
    RAISE EXCEPTION 'Jadwal wawancara Anda sudah dikonfirmasi dan tidak dapat diubah.';
  END IF;

  FOR v_pair IN SELECT * FROM public.pick_interview_pair(p_start_at, v_booking.id) LOOP
    v_ids := v_ids || v_pair.admin_id;
    v_location := coalesce(v_location, v_pair.location);
  END LOOP;

  IF coalesce(array_length(v_ids, 1), 0) < 2 THEN
    RAISE EXCEPTION 'Jadwal ini sudah penuh. Silakan pilih jadwal lain.';
  END IF;

  IF v_booking.id IS NULL THEN
    INSERT INTO public.interview_bookings (applicant_id, start_at, location)
    VALUES (v_applicant, p_start_at, v_location)
    RETURNING * INTO v_booking;
  ELSE
    UPDATE public.interview_bookings
    SET start_at = p_start_at,
        location = v_location,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_booking.id
    RETURNING * INTO v_booking;

    DELETE FROM public.interview_booking_interviewers WHERE booking_id = v_booking.id;
  END IF;

  INSERT INTO public.interview_booking_interviewers (booking_id, admin_id, start_at)
  SELECT v_booking.id, unnest(v_ids), p_start_at;

  RETURN public.get_my_interview_booking();
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_interview_booking()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_applicant uuid := public.current_submitted_applicant_id();
BEGIN
  IF v_applicant IS NULL THEN
    RAISE EXCEPTION 'Hanya calon anggota yang sudah mengirim formulir yang dapat mengonfirmasi jadwal.';
  END IF;

  UPDATE public.interview_bookings
  SET status = 'accepted',
      accepted_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  WHERE applicant_id = v_applicant AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Belum ada jadwal yang dipilih atau jadwal sudah dikonfirmasi.';
  END IF;

  RETURN public.get_my_interview_booking();
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_interview_booking()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_applicant uuid := public.current_submitted_applicant_id();
BEGIN
  IF v_applicant IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  DELETE FROM public.interview_bookings
  WHERE applicant_id = v_applicant AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tidak ada jadwal yang dapat dibatalkan.';
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.current_admin_id() FROM public, anon;
REVOKE ALL ON FUNCTION public.current_submitted_applicant_id() FROM public, anon;
REVOKE ALL ON FUNCTION public.pick_interview_pair(timestamptz, uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_interview_booking() FROM public, anon;
REVOKE ALL ON FUNCTION public.get_interview_slots() FROM public, anon;
REVOKE ALL ON FUNCTION public.book_interview_slot(timestamptz) FROM public, anon;
REVOKE ALL ON FUNCTION public.accept_interview_booking() FROM public, anon;
REVOKE ALL ON FUNCTION public.cancel_interview_booking() FROM public, anon;

GRANT EXECUTE ON FUNCTION public.current_admin_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_submitted_applicant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_interview_booking() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_interview_slots() TO authenticated;
GRANT EXECUTE ON FUNCTION public.book_interview_slot(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_interview_booking() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_interview_booking() TO authenticated;

-- 5. Proteksi: ketersediaan yang sudah dipesan tidak bisa dihapus ----------
CREATE OR REPLACE FUNCTION public.guard_interview_availability_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.interview_booking_interviewers bi
    WHERE bi.admin_id = OLD.admin_id AND bi.start_at = OLD.start_at
  ) THEN
    RAISE EXCEPTION 'Jadwal ini sudah dipesan calon anggota sehingga tidak dapat dihapus.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS interview_availability_guard_delete ON public.interview_availability;
CREATE TRIGGER interview_availability_guard_delete
  BEFORE DELETE ON public.interview_availability
  FOR EACH ROW EXECUTE FUNCTION public.guard_interview_availability_delete();

-- 6. RLS ------------------------------------------------------------------------
ALTER TABLE public.interview_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_booking_interviewers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.interview_availability FROM anon;
REVOKE ALL ON public.interview_bookings FROM anon;
REVOKE ALL ON public.interview_booking_interviewers FROM anon;
GRANT SELECT, INSERT, DELETE ON public.interview_availability TO authenticated;
GRANT SELECT ON public.interview_bookings TO authenticated;
GRANT SELECT ON public.interview_booking_interviewers TO authenticated;

DROP POLICY IF EXISTS interview_availability_select_admins ON public.interview_availability;
CREATE POLICY interview_availability_select_admins ON public.interview_availability
  FOR SELECT TO authenticated
  USING (public.is_active_admin());

DROP POLICY IF EXISTS interview_availability_insert_own ON public.interview_availability;
CREATE POLICY interview_availability_insert_own ON public.interview_availability
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_admin_permission('interview.schedule')
    AND admin_id = public.current_admin_id()
    AND start_at > now()
  );

DROP POLICY IF EXISTS interview_availability_delete_own ON public.interview_availability;
CREATE POLICY interview_availability_delete_own ON public.interview_availability
  FOR DELETE TO authenticated
  USING (
    public.has_admin_permission('interview.schedule')
    AND admin_id = public.current_admin_id()
  );

DROP POLICY IF EXISTS interview_bookings_select_admins ON public.interview_bookings;
CREATE POLICY interview_bookings_select_admins ON public.interview_bookings
  FOR SELECT TO authenticated
  USING (public.is_active_admin());

DROP POLICY IF EXISTS interview_booking_interviewers_select_admins ON public.interview_booking_interviewers;
CREATE POLICY interview_booking_interviewers_select_admins ON public.interview_booking_interviewers
  FOR SELECT TO authenticated
  USING (public.is_active_admin());
