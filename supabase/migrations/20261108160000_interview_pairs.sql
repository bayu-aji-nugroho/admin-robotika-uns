-- =====================================================================
-- Pasangan Pewawancara + Kalender Bersama
-- ---------------------------------------------------------------------
-- Mengganti model ketersediaan per-admin (20261108150000) menjadi
-- per-pasangan. Saat migration ini dibuat tabel jadwal masih kosong.
--
-- * Admin A mengundang admin B -> pasangan "pending"; B menerima -> "active".
--   Satu admin hanya boleh punya 1 pasangan/undangan pada satu waktu.
-- * Ketersediaan disimpan per pasangan (kalender bersama): A atau B
--   mengubah, keduanya melihat jadwal yang sama.
-- * Superadmin dapat melihat & mengubah kalender semua pasangan,
--   membentuk pasangan langsung, dan memutus pasangan.
-- * Pasangan tidak bisa diputus bila masih punya jadwal mendatang yang
--   sudah dipesan calon anggota.
-- * Calon anggota memilih jam; sistem memilih pasangan yang tersedia
--   (paling sedikit jadwalnya). 1 pasangan = 1 calon anggota per jam.
-- =====================================================================

-- 1. Bersihkan struktur lama (per-admin) ---------------------------------
DROP FUNCTION IF EXISTS public.pick_interview_pair(timestamptz, uuid);
DROP FUNCTION IF EXISTS public.interview_hour_location(timestamptz);
DROP TABLE IF EXISTS public.interview_booking_interviewers;
DROP TABLE IF EXISTS public.interview_bookings;
DROP TABLE IF EXISTS public.interview_availability;
DROP FUNCTION IF EXISTS public.guard_interview_availability_delete();

-- 2. Tabel -----------------------------------------------------------------
CREATE TABLE public.interview_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_a uuid NOT NULL REFERENCES public.admin_whitelist(id) ON DELETE CASCADE,
  member_b uuid NOT NULL REFERENCES public.admin_whitelist(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid REFERENCES public.admin_whitelist(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  accepted_at timestamptz,
  CONSTRAINT interview_pairs_distinct_members CHECK (member_a <> member_b),
  CONSTRAINT interview_pairs_status_check CHECK (status IN ('pending', 'active'))
);

CREATE TABLE public.interview_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id uuid NOT NULL REFERENCES public.interview_pairs(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  location text,
  updated_by uuid REFERENCES public.admin_whitelist(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT interview_availability_pair_slot_unique UNIQUE (pair_id, start_at),
  CONSTRAINT interview_availability_full_hour CHECK (extract(minute FROM start_at) = 0 AND extract(second FROM start_at) = 0),
  CONSTRAINT interview_availability_location_length CHECK (location IS NULL OR char_length(location) <= 300)
);
CREATE INDEX interview_availability_start_idx ON public.interview_availability (start_at);

CREATE TABLE public.interview_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id uuid NOT NULL UNIQUE REFERENCES public.applicants(id) ON DELETE CASCADE,
  pair_id uuid REFERENCES public.interview_pairs(id) ON DELETE SET NULL,
  -- Snapshot pewawancara saat dipesan (tetap tampil walau pasangan berubah)
  interviewer_ids uuid[] NOT NULL DEFAULT '{}',
  start_at timestamptz NOT NULL,
  location text,
  status text NOT NULL DEFAULT 'pending',
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT interview_bookings_status_check CHECK (status IN ('pending', 'accepted'))
);
CREATE INDEX interview_bookings_start_idx ON public.interview_bookings (start_at);
-- Satu pasangan hanya mewawancarai 1 calon anggota per jam
CREATE UNIQUE INDEX interview_bookings_pair_slot_unique
  ON public.interview_bookings (pair_id, start_at) WHERE pair_id IS NOT NULL;

-- 3. Helper -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_display_name(p_admin uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(nullif(btrim(full_name), ''), split_part(email, '@', 1))
  FROM public.admin_whitelist WHERE id = p_admin;
$$;

CREATE OR REPLACE FUNCTION public.admin_id_has_permission(p_admin uuid, p_permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_whitelist aw
    LEFT JOIN public.admin_roles r ON r.id = aw.role_id
    WHERE aw.id = p_admin AND aw.is_active = true
      AND (aw.is_superadmin = true OR p_permission = ANY (coalesce(r.permissions, '{}')))
  );
$$;

-- Satu admin hanya boleh tercatat di 1 pasangan/undangan
CREATE OR REPLACE FUNCTION public.guard_interview_pair_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.interview_pairs p
    WHERE p.id <> NEW.id
      AND (p.member_a IN (NEW.member_a, NEW.member_b) OR p.member_b IN (NEW.member_a, NEW.member_b))
  ) THEN
    RAISE EXCEPTION 'Salah satu admin sudah memiliki pasangan atau undangan yang belum dijawab.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER interview_pairs_guard_membership
  BEFORE INSERT OR UPDATE OF member_a, member_b ON public.interview_pairs
  FOR EACH ROW EXECUTE FUNCTION public.guard_interview_pair_membership();

-- Pasangan dengan jadwal mendatang yang sudah dipesan tidak boleh diputus
CREATE OR REPLACE FUNCTION public.guard_interview_pair_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.interview_bookings b
    WHERE b.pair_id = OLD.id AND b.start_at > now()
  ) THEN
    RAISE EXCEPTION 'Pasangan ini masih memiliki jadwal wawancara yang sudah dipesan calon anggota sehingga tidak dapat diputus.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER interview_pairs_guard_delete
  BEFORE DELETE ON public.interview_pairs
  FOR EACH ROW EXECUTE FUNCTION public.guard_interview_pair_delete();

-- Pemilih pasangan untuk sebuah jam (dipakai RPC calon anggota)
CREATE OR REPLACE FUNCTION public.pick_interview_pair_for_slot(
  p_start_at timestamptz,
  p_exclude_booking uuid DEFAULT NULL
)
RETURNS TABLE (pair_id uuid, member_a uuid, member_b uuid, location text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.member_a, p.member_b, nullif(btrim(av.location), '')
  FROM public.interview_availability av
  JOIN public.interview_pairs p ON p.id = av.pair_id AND p.status = 'active'
  JOIN public.admin_whitelist wa ON wa.id = p.member_a AND wa.is_active = true
  JOIN public.admin_whitelist wb ON wb.id = p.member_b AND wb.is_active = true
  WHERE av.start_at = p_start_at
    AND NOT EXISTS (
      SELECT 1 FROM public.interview_bookings b
      WHERE b.pair_id = p.id AND b.start_at = p_start_at
        AND b.id IS DISTINCT FROM p_exclude_booking
    )
  ORDER BY
    (SELECT count(*) FROM public.interview_bookings b2
      WHERE b2.pair_id = p.id AND b2.id IS DISTINCT FROM p_exclude_booking) ASC,
    av.created_at ASC,
    p.id ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.interview_hour_location(p_start_at timestamptz)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT av.location FROM public.interview_availability av
  WHERE av.start_at = p_start_at AND nullif(btrim(av.location), '') IS NOT NULL
  ORDER BY av.created_at ASC
  LIMIT 1;
$$;

-- 4. RPC admin: pasangan -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.invite_interview_partner(p_partner uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := public.current_admin_id();
  v_pair uuid;
BEGIN
  IF v_me IS NULL OR NOT public.has_admin_permission('interview.schedule') THEN
    RAISE EXCEPTION 'Akses ditolak: Role Anda tidak memiliki hak jadwal wawancara.';
  END IF;
  IF p_partner IS NULL OR p_partner = v_me THEN
    RAISE EXCEPTION 'Pilih admin lain sebagai pasangan.';
  END IF;
  IF NOT public.admin_id_has_permission(p_partner, 'interview.schedule') THEN
    RAISE EXCEPTION 'Admin tersebut tidak aktif atau tidak memiliki hak jadwal wawancara.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('interview_pairs'));

  INSERT INTO public.interview_pairs (member_a, member_b, status, created_by)
  VALUES (v_me, p_partner, 'pending', v_me)
  RETURNING id INTO v_pair;

  RETURN v_pair;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_interview_invite(p_pair uuid, p_accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := public.current_admin_id();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  IF p_accept THEN
    UPDATE public.interview_pairs
    SET status = 'active', accepted_at = timezone('utc'::text, now())
    WHERE id = p_pair AND member_b = v_me AND status = 'pending';
  ELSE
    DELETE FROM public.interview_pairs
    WHERE id = p_pair AND member_b = v_me AND status = 'pending';
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Undangan tidak ditemukan atau sudah tidak berlaku.';
  END IF;
END;
$$;

-- Membatalkan undangan / memutus pasangan (anggota pasangan atau superadmin)
CREATE OR REPLACE FUNCTION public.leave_interview_pair(p_pair uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := public.current_admin_id();
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  DELETE FROM public.interview_pairs
  WHERE id = p_pair
    AND (member_a = v_me OR member_b = v_me OR public.is_admin_superuser());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pasangan tidak ditemukan atau Anda tidak memiliki akses.';
  END IF;
END;
$$;

-- Superadmin membentuk pasangan langsung (tanpa undangan)
CREATE OR REPLACE FUNCTION public.create_interview_pair(p_member_a uuid, p_member_b uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := public.current_admin_id();
  v_pair uuid;
BEGIN
  IF NOT public.is_admin_superuser() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya superadmin yang dapat membentuk pasangan secara langsung.';
  END IF;
  IF p_member_a IS NULL OR p_member_b IS NULL OR p_member_a = p_member_b THEN
    RAISE EXCEPTION 'Pilih dua admin yang berbeda.';
  END IF;
  IF NOT public.admin_id_has_permission(p_member_a, 'interview.schedule')
     OR NOT public.admin_id_has_permission(p_member_b, 'interview.schedule') THEN
    RAISE EXCEPTION 'Kedua admin harus aktif dan memiliki hak jadwal wawancara.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('interview_pairs'));

  INSERT INTO public.interview_pairs (member_a, member_b, status, created_by, accepted_at)
  VALUES (p_member_a, p_member_b, 'active', v_me, timezone('utc'::text, now()))
  RETURNING id INTO v_pair;

  RETURN v_pair;
END;
$$;

-- 5. RPC admin: kalender bersama ---------------------------------------------
-- Menyimpan jam ketersediaan pasangan untuk satu tanggal (WIB).
-- p_hours = jam mulai sesi (7..20). Jam baru ditambah, jam yang tidak dipilih
-- dihapus, kecuali jam yang sudah lewat atau sudah dipesan.
CREATE OR REPLACE FUNCTION public.set_pair_availability(
  p_pair uuid,
  p_date date,
  p_hours int[],
  p_location text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := public.current_admin_id();
  v_pair public.interview_pairs%ROWTYPE;
  v_location text := nullif(btrim(coalesce(p_location, '')), '');
  v_day_start timestamptz := (p_date::timestamp) AT TIME ZONE 'Asia/Jakarta';
  v_day_end timestamptz := ((p_date + 1)::timestamp) AT TIME ZONE 'Asia/Jakarta';
  v_wanted timestamptz[];
  v_added int := 0;
  v_removed int := 0;
  v_kept int := 0;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  SELECT * INTO v_pair FROM public.interview_pairs WHERE id = p_pair FOR UPDATE;
  IF NOT FOUND OR v_pair.status <> 'active' THEN
    RAISE EXCEPTION 'Pasangan tidak ditemukan atau belum aktif.';
  END IF;

  IF NOT (
    public.is_admin_superuser()
    OR ((v_me = v_pair.member_a OR v_me = v_pair.member_b) AND public.has_admin_permission('interview.schedule'))
  ) THEN
    RAISE EXCEPTION 'Akses ditolak: Anda bukan anggota pasangan ini.';
  END IF;

  IF EXISTS (SELECT 1 FROM unnest(coalesce(p_hours, '{}')) h WHERE h < 7 OR h > 20) THEN
    RAISE EXCEPTION 'Jam wawancara hanya antara 07.00 sampai 21.00.';
  END IF;

  IF v_location IS NOT NULL AND char_length(v_location) > 300 THEN
    RAISE EXCEPTION 'Lokasi/link maksimal 300 karakter.';
  END IF;

  SELECT coalesce(array_agg(DISTINCT ((p_date::timestamp + make_interval(hours => h)) AT TIME ZONE 'Asia/Jakarta')), '{}')
  INTO v_wanted
  FROM unnest(coalesce(p_hours, '{}')) h;

  -- Jam yang tidak dipilih lagi: hapus bila belum lewat & belum dipesan
  WITH removable AS (
    DELETE FROM public.interview_availability av
    WHERE av.pair_id = p_pair
      AND av.start_at >= v_day_start AND av.start_at < v_day_end
      AND av.start_at > now()
      AND NOT (av.start_at = ANY (v_wanted))
      AND NOT EXISTS (
        SELECT 1 FROM public.interview_bookings b WHERE b.pair_id = p_pair AND b.start_at = av.start_at
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_removed FROM removable;

  SELECT count(*) INTO v_kept
  FROM public.interview_availability av
  WHERE av.pair_id = p_pair
    AND av.start_at >= v_day_start AND av.start_at < v_day_end
    AND NOT (av.start_at = ANY (v_wanted))
    AND EXISTS (SELECT 1 FROM public.interview_bookings b WHERE b.pair_id = p_pair AND b.start_at = av.start_at);

  WITH inserted AS (
    INSERT INTO public.interview_availability (pair_id, start_at, location, updated_by)
    SELECT p_pair, t, v_location, v_me
    FROM unnest(v_wanted) t
    WHERE t > now()
    ON CONFLICT (pair_id, start_at) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_added FROM inserted;

  RETURN jsonb_build_object('added', v_added, 'removed', v_removed, 'kept_booked', v_kept);
END;
$$;

-- 6. RPC calon anggota ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_interview_booking()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
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
      SELECT jsonb_agg(public.admin_display_name(x.admin_id) ORDER BY x.ord)
      FROM unnest(b.interviewer_ids) WITH ORDINALITY AS x(admin_id, ord)
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM public.interview_bookings b
  WHERE b.applicant_id = v_applicant;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_interview_slots()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_applicant uuid := public.current_submitted_applicant_id();
  v_booking uuid;
  v_slots jsonb := '[]'::jsonb;
  v_hour timestamptz;
  v_pick record;
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
    SELECT * INTO v_pick FROM public.pick_interview_pair_for_slot(v_hour, v_booking);
    IF FOUND THEN
      v_slots := v_slots || jsonb_build_object(
        'start_at', v_hour,
        'location', coalesce(v_pick.location, public.interview_hour_location(v_hour)),
        'interviewers', jsonb_build_array(
          public.admin_display_name(v_pick.member_a),
          public.admin_display_name(v_pick.member_b)
        )
      );
    END IF;
  END LOOP;

  RETURN v_slots;
END;
$$;

CREATE OR REPLACE FUNCTION public.book_interview_slot(p_start_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_applicant uuid := public.current_submitted_applicant_id();
  v_booking public.interview_bookings%ROWTYPE;
  v_pick record;
  v_location text;
BEGIN
  IF v_applicant IS NULL THEN
    RAISE EXCEPTION 'Hanya calon anggota yang sudah mengirim formulir yang dapat memilih jadwal wawancara.';
  END IF;

  IF p_start_at IS NULL OR p_start_at <= now() THEN
    RAISE EXCEPTION 'Jadwal yang dipilih sudah lewat. Silakan pilih jadwal lain.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('interview_slot:' || p_start_at::text));

  SELECT * INTO v_booking FROM public.interview_bookings WHERE applicant_id = v_applicant FOR UPDATE;

  IF FOUND AND v_booking.status = 'accepted' THEN
    RAISE EXCEPTION 'Jadwal wawancara Anda sudah dikonfirmasi dan tidak dapat diubah.';
  END IF;

  SELECT * INTO v_pick FROM public.pick_interview_pair_for_slot(p_start_at, v_booking.id);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jadwal ini sudah penuh. Silakan pilih jadwal lain.';
  END IF;

  v_location := coalesce(v_pick.location, public.interview_hour_location(p_start_at));

  IF v_booking.id IS NULL THEN
    INSERT INTO public.interview_bookings (applicant_id, pair_id, interviewer_ids, start_at, location)
    VALUES (v_applicant, v_pick.pair_id, ARRAY[v_pick.member_a, v_pick.member_b], p_start_at, v_location);
  ELSE
    UPDATE public.interview_bookings
    SET pair_id = v_pick.pair_id,
        interviewer_ids = ARRAY[v_pick.member_a, v_pick.member_b],
        start_at = p_start_at,
        location = v_location,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_booking.id;
  END IF;

  RETURN public.get_my_interview_booking();
END;
$$;

-- accept_interview_booking & cancel_interview_booking tidak berubah (hanya status).

-- 7. Hak akses fungsi ----------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_display_name(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_id_has_permission(uuid, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.pick_interview_pair_for_slot(timestamptz, uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.interview_hour_location(timestamptz) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.invite_interview_partner(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.respond_interview_invite(uuid, boolean) FROM public, anon;
REVOKE ALL ON FUNCTION public.leave_interview_pair(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.create_interview_pair(uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.set_pair_availability(uuid, date, int[], text) FROM public, anon;
REVOKE ALL ON FUNCTION public.get_my_interview_booking() FROM public, anon;
REVOKE ALL ON FUNCTION public.get_interview_slots() FROM public, anon;
REVOKE ALL ON FUNCTION public.book_interview_slot(timestamptz) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.invite_interview_partner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_interview_invite(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_interview_pair(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_interview_pair(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_pair_availability(uuid, date, int[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_interview_booking() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_interview_slots() TO authenticated;
GRANT EXECUTE ON FUNCTION public.book_interview_slot(timestamptz) TO authenticated;

-- 8. RLS: hanya baca untuk admin; semua penulisan lewat RPC di atas -------------
ALTER TABLE public.interview_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_bookings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.interview_pairs FROM anon, authenticated;
REVOKE ALL ON public.interview_availability FROM anon, authenticated;
REVOKE ALL ON public.interview_bookings FROM anon, authenticated;
GRANT SELECT ON public.interview_pairs TO authenticated;
GRANT SELECT ON public.interview_availability TO authenticated;
GRANT SELECT ON public.interview_bookings TO authenticated;

CREATE POLICY interview_pairs_select_admins ON public.interview_pairs
  FOR SELECT TO authenticated USING (public.is_active_admin());

CREATE POLICY interview_availability_select_admins ON public.interview_availability
  FOR SELECT TO authenticated USING (public.is_active_admin());

CREATE POLICY interview_bookings_select_admins ON public.interview_bookings
  FOR SELECT TO authenticated USING (public.is_active_admin());
