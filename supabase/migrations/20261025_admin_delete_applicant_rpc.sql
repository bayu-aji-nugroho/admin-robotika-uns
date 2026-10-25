-- ==============================================================================
-- Migration: Tambahkan Kebijakan Hapus & Stored Procedure Pembersihan Peserta
-- Deskripsi: Mengizinkan admin aktif menghapus data registrasi, berkas CV,
--            serta akun autentikasi pemohon secara menyeluruh dan permanen.
-- ==============================================================================

-- 1. Berikan hak DELETE pada storage.objects untuk bucket 'cv-uploads'
DROP POLICY IF EXISTS "admin_whitelist_delete_cv_storage" ON storage.objects;
CREATE POLICY "admin_whitelist_delete_cv_storage" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'cv-uploads'
  AND EXISTS (
    SELECT 1 FROM public.admin_whitelist
    WHERE lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
      AND is_active = true
  )
);

-- 2. Berikan hak DELETE pada tabel public.registrations untuk admin aktif
DROP POLICY IF EXISTS "registrations_admin_delete" ON public.registrations;
CREATE POLICY "registrations_admin_delete" ON public.registrations
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_whitelist
    WHERE lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
      AND is_active = true
  )
);

-- 3. Stored Procedure SECURITY DEFINER untuk menghapus akun di auth.users & tabel pendaftaran
CREATE OR REPLACE FUNCTION public.delete_applicant_by_admin(p_registration_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  v_caller_email TEXT;
  v_user_id UUID;
  v_user_email TEXT;
  v_cv_storage_path TEXT;
BEGIN
  -- A. Verifikasi hak akses admin
  v_caller_email := lower(coalesce(auth.jwt()->>'email', ''));
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_whitelist
    WHERE lower(email) = v_caller_email
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya admin terdaftar dan aktif yang diizinkan menghapus peserta.';
  END IF;

  -- B. Ambil informasi pendaftar sebelum dihapus
  SELECT user_id, user_email, cv_storage_path
  INTO v_user_id, v_user_email, v_cv_storage_path
  FROM public.registrations
  WHERE id = p_registration_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Data pendaftar tidak ditemukan.'
    );
  END IF;

  -- C. Hapus akun login dari auth.users
  IF v_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_user_id;
  ELSIF v_user_email IS NOT NULL AND trim(v_user_email) <> '' THEN
    DELETE FROM auth.users WHERE lower(email) = lower(trim(v_user_email));
  END IF;

  -- D. Hapus data dari tabel hasil_oprec jika belum terhapus lewat cascade
  DELETE FROM public.hasil_oprec WHERE registration_id = p_registration_id;

  -- E. Hapus data dari tabel registrations jika belum terhapus lewat cascade
  DELETE FROM public.registrations WHERE id = p_registration_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Data pendaftar, akun login, dan riwayat tabel berhasil dihapus.',
    'user_id', v_user_id,
    'user_email', v_user_email,
    'cv_storage_path', v_cv_storage_path
  );
END;
$$;

-- 4. Berikan izin eksekusi fungsi RPC ke authenticated user
REVOKE EXECUTE ON FUNCTION public.delete_applicant_by_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_applicant_by_admin(UUID) TO authenticated;
