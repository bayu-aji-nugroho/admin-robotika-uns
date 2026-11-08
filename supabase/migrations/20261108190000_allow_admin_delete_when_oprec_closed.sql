-- Perbaikan: penghapusan pendaftar (tombol "Hapus Peserta" admin & pembersihan data)
-- sebelumnya gagal karena trigger di applicant_divisions ikut memblokir DELETE:
--   * check_registration_oprec_open  -> menolak saat OPREC ditutup
--   * enforce_applicant_divisions_immutability -> menolak bila pendaftar sudah submit
-- Kedua penjaga ini dimaksudkan untuk INSERT/UPDATE oleh calon anggota. DELETE di
-- applicant_divisions hanya diizinkan untuk admin (RLS applicant_divisions_admin_delete)
-- dan service role, sehingga DELETE dilewatkan dari kedua penjaga.

CREATE OR REPLACE FUNCTION public.check_registration_oprec_open()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_oprec BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  SELECT is_oprec INTO v_is_oprec FROM public.admin_settings WHERE id = 1 LIMIT 1;
  IF v_is_oprec IS NOT TRUE THEN
    RAISE EXCEPTION 'Akses ditolak: Pendaftaran calon anggota sedang ditutup (Oprec Inactive). Tidak diperkenankan menyimpan atau memodifikasi data.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_applicant_divisions_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status VARCHAR(20);
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  SELECT status INTO v_status FROM public.applicants WHERE id = NEW.applicant_id;
  IF v_status = 'submitted' THEN
    RAISE EXCEPTION 'Pilihan divisi tidak dapat diubah atau dihapus karena berkas pendaftaran telah dikirim.';
  END IF;

  RETURN NEW;
END;
$$;
