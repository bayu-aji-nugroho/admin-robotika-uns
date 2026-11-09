-- Jadwal buka/tutup OPREC otomatis.
-- * admin_settings.oprec_open_at / oprec_close_at (WIB diisi dari dashboard).
-- * Bila salah satu tanggal diisi -> MODE OTOMATIS: is_oprec dihitung dari jadwal
--   (dibuka saat open_at, ditutup saat close_at). Bila keduanya kosong -> MODE MANUAL
--   memakai toggle is_oprec seperti sebelumnya.
-- * is_oprec tetap jadi sumber kebenaran untuk Edge Function, website, dan admin
--   versi lama; nilainya disinkronkan:
--     - saat pengaturan disimpan (trigger BEFORE UPDATE/INSERT),
--     - setiap menit oleh pg_cron (agar berganti tepat waktu tanpa ada yang menyimpan).
-- * Penjaga database check_registration_oprec_open langsung menghitung dari jadwal,
--   sehingga tepat di detik pergantian tanpa menunggu cron.

ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS oprec_open_at timestamptz,
  ADD COLUMN IF NOT EXISTS oprec_close_at timestamptz;

ALTER TABLE public.admin_settings DROP CONSTRAINT IF EXISTS admin_settings_oprec_schedule_order;
ALTER TABLE public.admin_settings ADD CONSTRAINT admin_settings_oprec_schedule_order CHECK (
  oprec_open_at IS NULL OR oprec_close_at IS NULL OR oprec_close_at > oprec_open_at
);

-- Status OPREC efektif untuk satu baris pengaturan
CREATE OR REPLACE FUNCTION public.oprec_open_from_schedule(
  p_is_oprec boolean,
  p_open_at timestamptz,
  p_close_at timestamptz
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN p_open_at IS NULL AND p_close_at IS NULL THEN coalesce(p_is_oprec, false)
    ELSE (p_open_at IS NULL OR now() >= p_open_at) AND (p_close_at IS NULL OR now() < p_close_at)
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_oprec_open()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT public.oprec_open_from_schedule(is_oprec, oprec_open_at, oprec_close_at)
     FROM public.admin_settings WHERE id = 1),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.oprec_open_from_schedule(boolean, timestamptz, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_oprec_open() TO anon, authenticated;

-- Saat pengaturan disimpan dalam mode otomatis, is_oprec langsung mengikuti jadwal
CREATE OR REPLACE FUNCTION public.apply_oprec_schedule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.oprec_open_at IS NOT NULL OR NEW.oprec_close_at IS NOT NULL THEN
    NEW.is_oprec := public.oprec_open_from_schedule(NEW.is_oprec, NEW.oprec_open_at, NEW.oprec_close_at);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_settings_apply_oprec_schedule ON public.admin_settings;
CREATE TRIGGER admin_settings_apply_oprec_schedule
  BEFORE INSERT OR UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION public.apply_oprec_schedule();

-- Dipanggil pg_cron tiap menit: ubah is_oprec bila jadwal sudah melewati batas
CREATE OR REPLACE FUNCTION public.sync_oprec_schedule()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.admin_settings
  SET is_oprec = public.oprec_open_from_schedule(is_oprec, oprec_open_at, oprec_close_at)
  WHERE id = 1
    AND (oprec_open_at IS NOT NULL OR oprec_close_at IS NOT NULL)
    AND is_oprec IS DISTINCT FROM public.oprec_open_from_schedule(is_oprec, oprec_open_at, oprec_close_at);
$$;

REVOKE ALL ON FUNCTION public.sync_oprec_schedule() FROM public, anon, authenticated;

-- Penjaga pendaftaran memakai status efektif (tepat waktu tanpa menunggu cron)
CREATE OR REPLACE FUNCTION public.check_registration_oprec_open()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF NOT public.is_oprec_open() THEN
    RAISE EXCEPTION 'Akses ditolak: Pendaftaran calon anggota sedang ditutup (Oprec Inactive). Tidak diperkenankan menyimpan atau memodifikasi data.';
  END IF;

  RETURN NEW;
END;
$$;

-- Jadwalkan sinkronisasi tiap menit
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'sync-oprec-schedule';
  PERFORM cron.schedule('sync-oprec-schedule', '* * * * *', 'select public.sync_oprec_schedule()');
END;
$$;
