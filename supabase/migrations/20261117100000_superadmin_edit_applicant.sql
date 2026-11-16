-- Edit data pendaftar oleh superadmin.
-- Trigger immutability / oprec-ditutup / SSO tetap berlaku untuk pendaftar, tetapi dilewati
-- bila perubahan datang dari RPC superadmin_* di bawah (flag transaksi app.superadmin_edit
-- + verifikasi ulang bahwa pemanggil memang superadmin aktif).

CREATE OR REPLACE FUNCTION public.is_current_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_whitelist aw
    WHERE lower(aw.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND aw.is_active = true
      AND aw.is_superadmin = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin_edit()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT coalesce(current_setting('app.superadmin_edit', true), '') = 'on'
     AND public.is_current_superadmin();
$$;

-- Trigger yang sudah ada: tambahkan pengecualian edit superadmin
CREATE OR REPLACE FUNCTION public.enforce_applicants_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_superadmin_edit() THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'submitted' THEN
    RAISE EXCEPTION 'Data pendaftaran yang sudah dikirim bersifat permanen dan tidak dapat diubah lagi.';
  END IF;

  IF OLD.nim IS NOT NULL AND NEW.nim IS DISTINCT FROM OLD.nim THEN
    RAISE EXCEPTION 'NIM yang telah disimpan bersifat permanen dan tidak dapat diubah.';
  END IF;

  IF OLD.full_name IS NOT NULL AND NEW.full_name IS DISTINCT FROM OLD.full_name THEN
    RAISE EXCEPTION 'Nama lengkap yang telah disimpan bersifat permanen dan tidak dapat diubah.';
  END IF;

  IF OLD.angkatan IS NOT NULL AND NEW.angkatan IS DISTINCT FROM OLD.angkatan THEN
    RAISE EXCEPTION 'Tahun angkatan yang telah disimpan bersifat permanen dan tidak dapat diubah.';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_applicant_divisions_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_status VARCHAR(20);
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF public.is_superadmin_edit() THEN
    RETURN NEW;
  END IF;

  SELECT status INTO v_status FROM public.applicants WHERE id = NEW.applicant_id;
  IF v_status = 'submitted' THEN
    RAISE EXCEPTION 'Pilihan divisi tidak dapat diubah atau dihapus karena berkas pendaftaran telah dikirim.';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_registration_oprec_open()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF public.is_superadmin_edit() THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_oprec_open() THEN
    RAISE EXCEPTION 'Akses ditolak: Pendaftaran calon anggota sedang ditutup (Oprec Inactive). Tidak diperkenankan menyimpan atau memodifikasi data.';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_applicant_sso_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
BEGIN
  IF TG_OP = 'UPDATE' AND public.is_superadmin_edit() THEN
    RETURN NEW;
  END IF;

  SELECT lower(email) INTO v_email FROM auth.users WHERE id = NEW.user_id;

  IF v_email IS NULL OR NOT public.is_applicant_email_allowed(v_email) THEN
    RAISE EXCEPTION 'Pendaftaran hanya dapat menggunakan email SSO mahasiswa UNS (@student.uns.ac.id). Silakan logout lalu masuk dengan akun SSO Anda.';
  END IF;

  RETURN NEW;
END;
$function$;

-- Ubah data pendaftar. p_data: full_name, nim, angkatan, whatsapp, fakultas, prodi,
-- twibbon_url, portfolio_url, primary_division_id, primary_reason,
-- secondary_division_id (kosong = hapus pilihan 2), secondary_reason.
CREATE OR REPLACE FUNCTION public.superadmin_update_applicant(p_applicant uuid, p_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_app public.applicants%ROWTYPE;
  v_name text := nullif(btrim(p_data ->> 'full_name'), '');
  v_nim text := nullif(btrim(p_data ->> 'nim'), '');
  v_angkatan text := nullif(btrim(p_data ->> 'angkatan'), '');
  v_wa text := nullif(regexp_replace(coalesce(p_data ->> 'whatsapp', ''), '[^0-9]', '', 'g'), '');
  v_fakultas text := nullif(btrim(p_data ->> 'fakultas'), '');
  v_prodi text := nullif(btrim(p_data ->> 'prodi'), '');
  v_twibbon text := nullif(btrim(p_data ->> 'twibbon_url'), '');
  v_portfolio text := nullif(btrim(p_data ->> 'portfolio_url'), '');
  v_div1 text := nullif(btrim(p_data ->> 'primary_division_id'), '');
  v_reason1 text := btrim(coalesce(p_data ->> 'primary_reason', ''));
  v_div2 text := nullif(btrim(p_data ->> 'secondary_division_id'), '');
  v_reason2 text := btrim(coalesce(p_data ->> 'secondary_reason', ''));
BEGIN
  IF NOT public.is_current_superadmin() THEN
    RAISE EXCEPTION 'Akses ditolak: hanya superadmin yang dapat mengubah data pendaftar.';
  END IF;

  SELECT * INTO v_app FROM public.applicants WHERE id = p_applicant FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Data pendaftar tidak ditemukan.';
  END IF;

  -- Validasi dengan pesan yang jelas (constraint tabel tetap berlaku sebagai lapisan terakhir)
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Nama lengkap wajib diisi.';
  END IF;
  IF v_name ~ '[0-9]' THEN
    RAISE EXCEPTION 'Nama lengkap tidak boleh mengandung angka.';
  END IF;
  IF v_nim IS NULL THEN
    RAISE EXCEPTION 'NIM wajib diisi.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.applicants WHERE nim = v_nim AND id <> p_applicant) THEN
    RAISE EXCEPTION 'NIM % sudah dipakai pendaftar lain.', v_nim;
  END IF;
  IF v_angkatan IS NOT NULL AND v_angkatan NOT IN ('2025', '2026') THEN
    RAISE EXCEPTION 'Angkatan hanya boleh 2025 atau 2026.';
  END IF;
  IF v_wa IS NOT NULL THEN
    IF v_wa LIKE '62%' THEN
      v_wa := '0' || substr(v_wa, 3);
    END IF;
    IF v_wa !~ '^08[0-9]{8,18}$' THEN
      RAISE EXCEPTION 'Nomor WhatsApp harus diawali 08 dan berisi 10–20 digit.';
    END IF;
  END IF;
  IF v_twibbon IS NOT NULL AND v_twibbon !~* '^https?://' THEN
    RAISE EXCEPTION 'Tautan Twibbon harus diawali https:// atau http://';
  END IF;
  IF v_portfolio IS NOT NULL AND v_portfolio !~* '^https?://' THEN
    RAISE EXCEPTION 'Tautan portofolio harus diawali https:// atau http://';
  END IF;
  IF v_div1 IS NULL THEN
    RAISE EXCEPTION 'Divisi pilihan 1 wajib dipilih.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.divisions WHERE id::text = v_div1) THEN
    RAISE EXCEPTION 'Divisi pilihan 1 tidak ditemukan.';
  END IF;
  IF v_div2 IS NOT NULL THEN
    IF v_div2 = v_div1 THEN
      RAISE EXCEPTION 'Divisi pilihan 1 dan 2 tidak boleh sama.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.divisions WHERE id::text = v_div2) THEN
      RAISE EXCEPTION 'Divisi pilihan 2 tidak ditemukan.';
    END IF;
  END IF;

  PERFORM set_config('app.superadmin_edit', 'on', true);

  UPDATE public.applicants SET
    full_name = v_name,
    nim = v_nim,
    angkatan = v_angkatan,
    whatsapp = v_wa,
    fakultas = v_fakultas,
    prodi = v_prodi,
    twibbon_url = v_twibbon,
    portfolio_url = v_portfolio,
    updated_at = now()
  WHERE id = p_applicant;

  -- Hapus lalu tulis ulang pilihan divisi (menghindari bentrok unique saat pilihan 1 & 2 ditukar)
  DELETE FROM public.applicant_divisions WHERE applicant_id = p_applicant;
  INSERT INTO public.applicant_divisions (applicant_id, division_id, priority, reason)
  VALUES (p_applicant, v_div1, 1, v_reason1);
  IF v_div2 IS NOT NULL THEN
    INSERT INTO public.applicant_divisions (applicant_id, division_id, priority, reason)
    VALUES (p_applicant, v_div2, 2, v_reason2);
  END IF;

  PERFORM set_config('app.superadmin_edit', '', true);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Ganti berkas CV: dipanggil setelah berkas baru diunggah ke storage.
-- Mengembalikan path CV lama agar server menghapusnya dari storage.
CREATE OR REPLACE FUNCTION public.superadmin_set_applicant_cv(p_applicant uuid, p_path text, p_file_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old text;
BEGIN
  IF NOT public.is_current_superadmin() THEN
    RAISE EXCEPTION 'Akses ditolak: hanya superadmin yang dapat mengganti CV pendaftar.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'cv-uploads' AND name = p_path) THEN
    RAISE EXCEPTION 'Berkas CV baru tidak ditemukan di storage.';
  END IF;

  SELECT cv_storage_path INTO v_old FROM public.applicants WHERE id = p_applicant FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Data pendaftar tidak ditemukan.';
  END IF;

  PERFORM set_config('app.superadmin_edit', 'on', true);
  UPDATE public.applicants
  SET cv_storage_path = p_path, cv_file_name = p_file_name, updated_at = now()
  WHERE id = p_applicant;
  PERFORM set_config('app.superadmin_edit', '', true);

  RETURN jsonb_build_object('old_path', v_old);
END;
$$;

REVOKE ALL ON FUNCTION public.superadmin_update_applicant(uuid, jsonb) FROM public, anon;
REVOKE ALL ON FUNCTION public.superadmin_set_applicant_cv(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.superadmin_update_applicant(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.superadmin_set_applicant_cv(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_superadmin() TO authenticated;

-- Superadmin boleh mengunggah CV pengganti ke bucket privat cv-uploads
DROP POLICY IF EXISTS superadmin_insert_cv_storage ON storage.objects;
CREATE POLICY superadmin_insert_cv_storage ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cv-uploads' AND public.is_current_superadmin());
