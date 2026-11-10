-- Kalender ketersediaan PRIBADI tiap pewawancara + jadwal pasangan = IRISAN keduanya.
-- * interview_admin_availability: tiap admin mengisi slot 30 menit saat dirinya bisa.
-- * interview_availability (kini VIEW): slot sebuah pasangan aktif = slot yang sama-sama
--   diisi oleh kedua anggotanya. Fungsi pemesanan calon anggota (get_interview_slots,
--   book_interview_slot, pick_interview_pair_for_slot, interview_hour_location) tetap
--   membaca nama ini sehingga tidak perlu diubah.
-- * Kalender pribadi tetap tersimpan walau pasangan berganti.
-- Saat migration dibuat tabel ketersediaan lama sudah dikosongkan (0 baris, 0 booking).

DO $$
BEGIN
  IF to_regclass('public.interview_availability') IS NOT NULL
     AND (SELECT relkind FROM pg_class WHERE oid = 'public.interview_availability'::regclass) = 'r'
     AND EXISTS (SELECT 1 FROM public.interview_availability) THEN
    RAISE EXCEPTION 'Dibatalkan: tabel interview_availability masih berisi data. Kosongkan dulu sebelum migrasi.';
  END IF;
END;
$$;

DROP TABLE IF EXISTS public.interview_availability CASCADE;

CREATE TABLE public.interview_admin_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.admin_whitelist(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  location text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT interview_admin_availability_unique UNIQUE (admin_id, start_at),
  CONSTRAINT interview_admin_availability_half_hour CHECK (
    extract(minute FROM start_at) IN (0, 30) AND extract(second FROM start_at) = 0
  ),
  CONSTRAINT interview_admin_availability_location_length CHECK (
    location IS NULL OR char_length(location) <= 300
  )
);
CREATE INDEX interview_admin_availability_start_idx ON public.interview_admin_availability (start_at);

ALTER TABLE public.interview_admin_availability ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.interview_admin_availability FROM anon, authenticated;
GRANT SELECT ON public.interview_admin_availability TO authenticated;

CREATE POLICY interview_admin_availability_select_admins ON public.interview_admin_availability
  FOR SELECT TO authenticated USING (public.is_active_admin());

-- Slot pasangan = irisan kalender kedua anggota
CREATE VIEW public.interview_availability
WITH (security_invoker = true) AS
SELECT
  md5(p.id::text || '|' || a.start_at::text)::uuid AS id,
  p.id AS pair_id,
  a.start_at,
  coalesce(nullif(btrim(a.location), ''), nullif(btrim(b.location), '')) AS location,
  NULL::uuid AS updated_by,
  greatest(a.created_at, b.created_at) AS created_at
FROM public.interview_pairs p
JOIN public.interview_admin_availability a ON a.admin_id = p.member_a
JOIN public.interview_admin_availability b ON b.admin_id = p.member_b AND b.start_at = a.start_at
WHERE p.status = 'active';

REVOKE ALL ON public.interview_availability FROM anon;
GRANT SELECT ON public.interview_availability TO authenticated;

-- Simpan kalender pribadi untuk satu tanggal (WIB).
-- p_slots = menit mulai sesi sejak 00.00 WIB (420 = 07.00 ... 1230 = 20.30, kelipatan 30).
-- p_admin = NULL untuk diri sendiri; superadmin boleh mengisi kalender admin lain.
-- Slot yang sudah lewat atau sudah dipesan (admin ini termasuk pewawancaranya) dipertahankan.
CREATE OR REPLACE FUNCTION public.set_admin_availability(
  p_date date,
  p_slots int[],
  p_location text DEFAULT NULL,
  p_admin uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := public.current_admin_id();
  v_target uuid;
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

  v_target := coalesce(p_admin, v_me);

  IF v_target = v_me THEN
    IF NOT public.has_admin_permission('interview.schedule') THEN
      RAISE EXCEPTION 'Akses ditolak: Role Anda tidak memiliki hak jadwal wawancara.';
    END IF;
  ELSIF NOT public.is_admin_superuser() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya superadmin yang dapat mengubah kalender admin lain.';
  ELSIF NOT public.admin_id_has_permission(v_target, 'interview.schedule') THEN
    RAISE EXCEPTION 'Admin tersebut tidak aktif atau tidak memiliki hak jadwal wawancara.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(coalesce(p_slots, '{}')) s
    WHERE s < 420 OR s > 1230 OR s % 30 <> 0
  ) THEN
    RAISE EXCEPTION 'Slot wawancara hanya antara 07.00 sampai 21.00 dengan kelipatan 30 menit.';
  END IF;

  IF v_location IS NOT NULL AND char_length(v_location) > 300 THEN
    RAISE EXCEPTION 'Lokasi/link maksimal 300 karakter.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('admin_availability:' || v_target::text));

  SELECT coalesce(array_agg(DISTINCT ((p_date::timestamp + make_interval(mins => s)) AT TIME ZONE 'Asia/Jakarta')), '{}')
  INTO v_wanted
  FROM unnest(coalesce(p_slots, '{}')) s;

  WITH removable AS (
    DELETE FROM public.interview_admin_availability av
    WHERE av.admin_id = v_target
      AND av.start_at >= v_day_start AND av.start_at < v_day_end
      AND av.start_at > now()
      AND NOT (av.start_at = ANY (v_wanted))
      AND NOT EXISTS (
        SELECT 1 FROM public.interview_bookings b
        WHERE b.start_at = av.start_at AND v_target = ANY (b.interviewer_ids)
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_removed FROM removable;

  SELECT count(*) INTO v_kept
  FROM public.interview_admin_availability av
  WHERE av.admin_id = v_target
    AND av.start_at >= v_day_start AND av.start_at < v_day_end
    AND NOT (av.start_at = ANY (v_wanted))
    AND EXISTS (
      SELECT 1 FROM public.interview_bookings b
      WHERE b.start_at = av.start_at AND v_target = ANY (b.interviewer_ids)
    );

  WITH inserted AS (
    INSERT INTO public.interview_admin_availability (admin_id, start_at, location)
    SELECT v_target, t, v_location
    FROM unnest(v_wanted) t
    WHERE t > now()
    ON CONFLICT (admin_id, start_at) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_added FROM inserted;

  RETURN jsonb_build_object('added', v_added, 'removed', v_removed, 'kept_booked', v_kept);
END;
$$;

REVOKE ALL ON FUNCTION public.set_admin_availability(date, int[], text, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_admin_availability(date, int[], text, uuid) TO authenticated;

-- Kompatibilitas dashboard lama (kalender "pasangan"): diterapkan ke kalender pribadi
-- pemanggil bila ia anggota pasangan; superadmin non-anggota -> kedua anggota.
CREATE OR REPLACE FUNCTION public.set_pair_availability_slots(
  p_pair uuid,
  p_date date,
  p_slots int[],
  p_location text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := public.current_admin_id();
  v_pair public.interview_pairs%ROWTYPE;
  v_result jsonb;
BEGIN
  SELECT * INTO v_pair FROM public.interview_pairs WHERE id = p_pair;
  IF NOT FOUND OR v_pair.status <> 'active' THEN
    RAISE EXCEPTION 'Pasangan tidak ditemukan atau belum aktif.';
  END IF;

  IF v_me = v_pair.member_a OR v_me = v_pair.member_b THEN
    RETURN public.set_admin_availability(p_date, p_slots, p_location, NULL);
  END IF;

  IF NOT public.is_admin_superuser() THEN
    RAISE EXCEPTION 'Akses ditolak: Anda bukan anggota pasangan ini.';
  END IF;

  PERFORM public.set_admin_availability(p_date, p_slots, p_location, v_pair.member_a);
  v_result := public.set_admin_availability(p_date, p_slots, p_location, v_pair.member_b);
  RETURN v_result;
END;
$$;
