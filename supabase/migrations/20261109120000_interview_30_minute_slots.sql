-- Sesi wawancara 30 menit (sebelumnya 60 menit).
-- * Slot ketersediaan kini boleh dimulai di menit :00 atau :30.
-- * Ketersediaan per jam yang sudah ada dipecah jadi dua slot 30 menit (mis. 08.00 -> 08.00 & 08.30)
--   agar jam yang sudah diisi pasangan tetap utuh.
-- * RPC baru set_pair_availability_slots(p_slots = menit sejak 00.00 WIB, kelipatan 30,
--   07.00 s/d 20.30). RPC lama set_pair_availability(p_hours) dipertahankan sebagai
--   pembungkus (1 jam = 2 slot) untuk dashboard admin versi lama selama masa deploy.

ALTER TABLE public.interview_availability DROP CONSTRAINT IF EXISTS interview_availability_full_hour;
ALTER TABLE public.interview_availability DROP CONSTRAINT IF EXISTS interview_availability_half_hour;
ALTER TABLE public.interview_availability ADD CONSTRAINT interview_availability_half_hour CHECK (
  extract(minute FROM start_at) IN (0, 30) AND extract(second FROM start_at) = 0
);

-- Pecah ketersediaan per jam lama menjadi 2 slot 30 menit
INSERT INTO public.interview_availability (pair_id, start_at, location, updated_by, created_at)
SELECT av.pair_id, av.start_at + interval '30 minutes', av.location, av.updated_by, av.created_at
FROM public.interview_availability av
WHERE extract(minute FROM av.start_at) = 0
  AND NOT EXISTS (
    SELECT 1 FROM public.interview_availability x
    WHERE x.pair_id = av.pair_id AND x.start_at = av.start_at + interval '30 minutes'
  )
ON CONFLICT (pair_id, start_at) DO NOTHING;

-- Simpan kalender bersama pasangan untuk satu tanggal (WIB).
-- p_slots = menit mulai sesi sejak 00.00 WIB (420 = 07.00, 450 = 07.30, ..., 1230 = 20.30).
-- Slot baru ditambah, slot yang tidak dipilih dihapus kecuali yang sudah lewat atau dipesan.
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

  IF EXISTS (
    SELECT 1 FROM unnest(coalesce(p_slots, '{}')) s
    WHERE s < 420 OR s > 1230 OR s % 30 <> 0
  ) THEN
    RAISE EXCEPTION 'Slot wawancara hanya antara 07.00 sampai 21.00 dengan kelipatan 30 menit.';
  END IF;

  IF v_location IS NOT NULL AND char_length(v_location) > 300 THEN
    RAISE EXCEPTION 'Lokasi/link maksimal 300 karakter.';
  END IF;

  SELECT coalesce(array_agg(DISTINCT ((p_date::timestamp + make_interval(mins => s)) AT TIME ZONE 'Asia/Jakarta')), '{}')
  INTO v_wanted
  FROM unnest(coalesce(p_slots, '{}')) s;

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

-- Pembungkus kompatibilitas untuk dashboard admin versi lama: 1 jam = slot :00 dan :30
CREATE OR REPLACE FUNCTION public.set_pair_availability(
  p_pair uuid,
  p_date date,
  p_hours int[],
  p_location text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM unnest(coalesce(p_hours, '{}')) h WHERE h < 7 OR h > 20) THEN
    RAISE EXCEPTION 'Jam wawancara hanya antara 07.00 sampai 21.00.';
  END IF;

  RETURN public.set_pair_availability_slots(
    p_pair,
    p_date,
    coalesce((SELECT array_agg(m) FROM unnest(coalesce(p_hours, '{}')) h, LATERAL (VALUES (h * 60), (h * 60 + 30)) v(m)), '{}'),
    p_location
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_pair_availability_slots(uuid, date, int[], text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_pair_availability_slots(uuid, date, int[], text) TO authenticated;
