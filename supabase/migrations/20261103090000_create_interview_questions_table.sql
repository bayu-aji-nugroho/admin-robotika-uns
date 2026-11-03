-- ==============================================================================
-- Migration: Create tabel interview_questions & RLS policies
-- Deskripsi: Menyimpan bank pertanyaan wawancara OPREC untuk kategori general
--            dan spesifik per divisi.
--            Hak akses:
--            - SELECT: Seluruh admin aktif di admin_whitelist
--            - INSERT/UPDATE/DELETE: Hanya role_oprec 'admin' dan 'developer'
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  division VARCHAR(50) NOT NULL DEFAULT 'general',
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indeks performa
CREATE INDEX IF NOT EXISTS idx_interview_questions_division ON public.interview_questions(division);
CREATE INDEX IF NOT EXISTS idx_interview_questions_active ON public.interview_questions(is_active);
CREATE INDEX IF NOT EXISTS idx_interview_questions_order ON public.interview_questions(order_index);

-- Trigger auto update updated_at
CREATE OR REPLACE FUNCTION public.handle_interview_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_interview_questions_updated_at ON public.interview_questions;
CREATE TRIGGER tr_interview_questions_updated_at
BEFORE UPDATE ON public.interview_questions
FOR EACH ROW
EXECUTE FUNCTION public.handle_interview_questions_updated_at();

-- Aktifkan Row Level Security
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT diizinkan untuk semua admin yang terdaftar dan aktif di whitelist
DROP POLICY IF EXISTS "interview_questions_select_active_admin" ON public.interview_questions;
CREATE POLICY "interview_questions_select_active_admin" ON public.interview_questions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_whitelist aw
    WHERE lower(aw.email) = lower(coalesce((select auth.jwt())->>'email', ''))
      AND aw.is_active = true
  )
);

-- Policy 2: INSERT / UPDATE / DELETE diizinkan HANYA untuk role_oprec 'admin' dan 'developer'
DROP POLICY IF EXISTS "interview_questions_cud_admin_dev" ON public.interview_questions;
CREATE POLICY "interview_questions_cud_admin_dev" ON public.interview_questions
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_whitelist aw
    WHERE lower(aw.email) = lower(coalesce((select auth.jwt())->>'email', ''))
      AND aw.is_active = true
      AND lower(aw.role_oprec) IN ('admin', 'developer')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_whitelist aw
    WHERE lower(aw.email) = lower(coalesce((select auth.jwt())->>'email', ''))
      AND aw.is_active = true
      AND lower(aw.role_oprec) IN ('admin', 'developer')
  )
);

-- Berikan hak akses tabel ke role authenticated dan anon (RLS tetap aktif menyaring)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_questions TO authenticated;

-- Seed Data Awal Pertanyaan Interview
INSERT INTO public.interview_questions (question, division, order_index)
VALUES
  -- General / Umum
  ('Ceritakan tentang diri Anda, latar belakang minat, dan alasan utama mendaftar UKM Robotika UNS.', 'general', 1),
  ('Bagaimana strategi manajemen waktu Anda antara jadwal perkuliahan, tugas praktikum, dan kegiatan UKM?', 'general', 2),
  ('Bagaimana Anda menyikapi dinamika kerja kelompok ketika ada perbedaan pendapat atau rekan yang pasif?', 'general', 3),
  ('Apa bentuk komitmen nyata yang dapat Anda berikan selama 1 periode kepengurusan ke depan?', 'general', 4),

  -- Divisi Pemrograman
  ('Bahasa pemrograman apa yang paling Anda kuasai (C/C++, Python, dsb.) dan apa proyek paling menantang yang pernah Anda kerjakan?', 'pemrograman', 1),
  ('Pernahkah Anda memprogram mikrokontroler (Arduino, STM32, ESP32) atau mengimplementasikan algoritma kendali robotika?', 'pemrograman', 2),
  ('Bagaimana prosedur dan kebiasaan Anda dalam melakukan debugging saat sistem mengalami crash atau anomali data sensor?', 'pemrograman', 3),

  -- Divisi Elektronika
  ('Software apa yang biasa Anda gunakan untuk merancang skematik & PCB (misal Eagle, KiCad, Altium), dan sejauh mana pengalaman Anda?', 'elektronika', 1),
  ('Bagaimana alur Anda dalam merancang sistem manajemen daya baterai (power distribution) dan proteksi sirkuit robot?', 'elektronika', 2),
  ('Bagaimana cara Anda mendeteksi dan menyelesaikan permasalahan noise atau gangguan sinyal pada sensor elektronika?', 'elektronika', 3),

  -- Divisi Mekanika
  ('Software CAD apa yang Anda kuasai (SolidWorks, Inventor, Fusion 360) dan seberapa sering Anda menggunakannya?', 'mekanika', 1),
  ('Bagaimana pertimbangan Anda dalam memilih material rangka (akrilik, aluminium, 3D print) berdasarkan beban mekanik?', 'mekanika', 2),
  ('Bagaimana cara Anda memastikan toleransi dimensi dan keselarasan antar komponen mekanik dalam perakitan fisik?', 'mekanika', 3),

  -- Divisi Administrasi
  ('Bagaimana pengalaman Anda dalam penyusunan proposal kegiatan resmi, surat perizinan, dan tata kelola arsip organisasi?', 'administrasi', 1),
  ('Bagaimana Anda memastikan ketepatan waktu pengarsipan dokumen dan koordinasi birokrasi kampus?', 'administrasi', 2),

  -- Divisi Bendahara
  ('Bagaimana pengalaman Anda dalam menyusun Rencana Anggaran Biaya (RAB) dan pembukuan arus kas (cash flow)?', 'bendahara', 1),
  ('Bagaimana strategi Anda dalam menjaga transparansi dan ketertiban pelaporan keuangan tim?', 'bendahara', 2),

  -- Divisi Media Branding
  ('Software kreatif apa yang Anda kuasai (Photoshop, Illustrator, Premiere, Figma) dan portofolio apa yang pernah Anda hasilkan?', 'media-branding', 1),
  ('Bagaimana strategi Anda dalam mengemas riset dan kompetisi robotika menjadi konten media sosial yang menarik dan edukatif?', 'media-branding', 2),

  -- Divisi Humas
  ('Bagaimana cara dan etika Anda dalam membangun relasi dengan pihak eksternal, calon sponsor, atau media partner?', 'humas', 1),
  ('Bagaimana kesiapan Anda menjadi garda terdepan representasi citra UKM Robotika UNS di lingkungan kampus dan publik?', 'humas', 2),

  -- Divisi Pengembangan Organisasi (PO)
  ('Bagaimana pendekatan Anda dalam merancang program bonding internal untuk menjaga motivasi dan soliditas anggota?', 'pengembangan-organisasi', 1),
  ('Bagaimana cara Anda menangani konflik internal antardivisi secara objektif dan solutif?', 'pengembangan-organisasi', 2)
ON CONFLICT DO NOTHING;

