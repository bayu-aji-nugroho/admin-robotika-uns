-- ==============================================================================
-- Migration: Secure admin_whitelist RLS
-- Deskripsi: Menutup akses publik (anon) ke tabel admin_whitelist.
--            Hanya user yang terautentikasi yang dapat membaca baris miliknya sendiri
--            berdasarkan klaim email di JWT auth.
-- ==============================================================================

-- 1. Hapus policy lama yang membuka akses read untuk publik/anon
DROP POLICY IF EXISTS "Allow public read whitelist" ON public.admin_whitelist;
DROP POLICY IF EXISTS "Allow read whitelist" ON public.admin_whitelist;

-- 2. Buat policy baru: Hanya user terautentikasi yang dapat melihat record email miliknya sendiri
CREATE POLICY "admin_whitelist_self_read" ON public.admin_whitelist
FOR SELECT TO authenticated
USING (lower(email) = lower(coalesce(auth.jwt()->>'email', '')));

-- Catatan Keamanan:
-- - Role 'anon' (belum login) sama sekali tidak memiliki akses SELECT ke tabel ini.
-- - Siapa pun yang menembak REST API Supabase tanpa token admin yang valid akan menerima array kosong [].
-- - Mencegah kebocoran data sensitif (nama, email, role, notes) ke pihak luar.
