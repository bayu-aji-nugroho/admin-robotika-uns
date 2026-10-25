-- ==============================================================================
-- Migration: Create tabel hasil_oprec untuk setiap peserta
-- Deskripsi: Menyimpan status hasil seleksi OPREC peserta (diterima, ditolak, dipertimbangkan).
--            Default: 'dipertimbangkan' jika current_step sudah lengkap (>= 6)
--            dan memiliki registration_code. Jika belum lengkap, status sementara 'ditolak'.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.hasil_oprec (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'dipertimbangkan',
  catatan TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_hasil_oprec_registration UNIQUE (registration_id),
  CONSTRAINT chk_hasil_oprec_status CHECK (status IN ('diterima', 'ditolak', 'dipertimbangkan'))
);

-- Index performa
CREATE INDEX IF NOT EXISTS idx_hasil_oprec_status ON public.hasil_oprec(status);
CREATE INDEX IF NOT EXISTS idx_hasil_oprec_registration_id ON public.hasil_oprec(registration_id);

-- RLS
ALTER TABLE public.hasil_oprec ENABLE ROW LEVEL SECURITY;

-- Policy SELECT untuk admin aktif
DROP POLICY IF EXISTS "hasil_oprec_admin_select" ON public.hasil_oprec;
CREATE POLICY "hasil_oprec_admin_select" ON public.hasil_oprec
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_whitelist
    WHERE lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
      AND is_active = true
  )
);

-- Policy INSERT/UPDATE/DELETE untuk admin aktif
DROP POLICY IF EXISTS "hasil_oprec_admin_modify" ON public.hasil_oprec;
CREATE POLICY "hasil_oprec_admin_modify" ON public.hasil_oprec
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_whitelist
    WHERE lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
      AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_whitelist
    WHERE lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
      AND is_active = true
  )
);

-- Fungsi trigger untuk inisialisasi default otomatis dari data registrations:
-- Jika user sudah melengkapi current_step (>= 6) dan mendapatkan registration_code -> 'dipertimbangkan'
-- Jika belum -> 'ditolak'
CREATE OR REPLACE FUNCTION public.sync_initial_hasil_oprec()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_step >= 6 AND NEW.registration_code IS NOT NULL AND trim(NEW.registration_code) <> '' THEN
    INSERT INTO public.hasil_oprec (registration_id, status)
    VALUES (NEW.id, 'dipertimbangkan')
    ON CONFLICT (registration_id) DO NOTHING;
  ELSE
    INSERT INTO public.hasil_oprec (registration_id, status)
    VALUES (NEW.id, 'ditolak')
    ON CONFLICT (registration_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_initial_hasil_oprec ON public.registrations;
CREATE TRIGGER tr_sync_initial_hasil_oprec
AFTER INSERT OR UPDATE OF current_step, registration_code ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.sync_initial_hasil_oprec();

-- Isi data awal hasil_oprec untuk pendaftar yang sudah ada saat ini di registrations
INSERT INTO public.hasil_oprec (registration_id, status)
SELECT 
  id,
  CASE 
    WHEN current_step >= 6 AND registration_code IS NOT NULL AND trim(registration_code) <> '' THEN 'dipertimbangkan'
    ELSE 'ditolak'
  END AS status
FROM public.registrations
ON CONFLICT (registration_id) DO NOTHING;
