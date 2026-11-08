-- =====================================================================
-- Custom Role & Hak Akses Admin
-- ---------------------------------------------------------------------
-- 1. Tabel admin_roles: nama role + daftar hak akses (permissions).
-- 2. admin_whitelist.role_id  -> role yang dimiliki admin.
--    admin_whitelist.is_superadmin -> ketua umum / wakil ketua / developer.
--    Superadmin otomatis punya semua akses dan satu-satunya yang boleh
--    mengelola role & anggota role. Flag ini hanya bisa diubah lewat SQL.
-- 3. Helper SQL: is_active_admin(), is_admin_superuser(),
--    has_admin_permission(text).
-- 4. RLS tabel OPREC diganti agar mengikuti hak akses role.
--
-- Kunci hak akses yang dikenal aplikasi:
--   applicants.view    Lihat daftar, detail, dan CV pendaftar
--   applicants.assess  Ubah penilaian / keputusan pendaftar
--   applicants.delete  Hapus pendaftar permanen
--   oprec.settings     Buka/tutup OPREC & ubah label pengumuman
--   interview.manage   Kelola bank pertanyaan wawancara
-- =====================================================================

-- 1. Tabel role ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  permissions text[] NOT NULL DEFAULT '{}',
  created_by text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT admin_roles_name_length CHECK (char_length(btrim(name)) BETWEEN 2 AND 50),
  CONSTRAINT admin_roles_permissions_known CHECK (
    permissions <@ ARRAY[
      'applicants.view',
      'applicants.assess',
      'applicants.delete',
      'oprec.settings',
      'interview.manage'
    ]::text[]
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_roles_name_unique
  ON public.admin_roles (lower(btrim(name)));

-- 2. Kolom baru admin_whitelist -----------------------------------------
ALTER TABLE public.admin_whitelist
  ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.admin_roles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_superadmin boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS admin_whitelist_role_id_idx ON public.admin_whitelist (role_id);
CREATE UNIQUE INDEX IF NOT EXISTS admin_whitelist_email_lower_unique
  ON public.admin_whitelist (lower(email));

-- 3. Seed: role dari nilai role_oprec yang sudah ada --------------------
--    admin & developer mendapat semua akses (sama seperti sebelumnya),
--    role lain mendapat semua akses kecuali kelola pertanyaan wawancara
--    (sesuai policy lama interview_questions yang hanya admin/developer).
INSERT INTO public.admin_roles (name, description, permissions, created_by)
SELECT DISTINCT ON (lower(btrim(aw.role_oprec)))
  btrim(aw.role_oprec),
  'Dibuat otomatis dari role_oprec lama',
  CASE
    WHEN lower(btrim(aw.role_oprec)) IN ('admin', 'developer') THEN ARRAY[
      'applicants.view', 'applicants.assess', 'applicants.delete',
      'oprec.settings', 'interview.manage'
    ]::text[]
    ELSE ARRAY[
      'applicants.view', 'applicants.assess', 'applicants.delete',
      'oprec.settings'
    ]::text[]
  END,
  'migration'
FROM public.admin_whitelist aw
WHERE char_length(btrim(coalesce(aw.role_oprec, ''))) >= 2
ON CONFLICT DO NOTHING;

UPDATE public.admin_whitelist aw
SET role_id = r.id
FROM public.admin_roles r
WHERE aw.role_id IS NULL
  AND lower(btrim(r.name)) = lower(btrim(aw.role_oprec));

UPDATE public.admin_whitelist
SET is_superadmin = true
WHERE lower(btrim(role_division)) IN ('ketua umum', 'ketua', 'wakil ketua')
   OR lower(btrim(role_oprec)) = 'developer';

-- 4. Helper functions ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_whitelist aw
    WHERE lower(aw.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND aw.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_superuser()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_whitelist aw
    WHERE lower(aw.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND aw.is_active = true
      AND aw.is_superadmin = true
  );
$$;

CREATE OR REPLACE FUNCTION public.has_admin_permission(p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_whitelist aw
    LEFT JOIN public.admin_roles r ON r.id = aw.role_id
    WHERE lower(aw.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND aw.is_active = true
      AND (aw.is_superadmin = true OR p_permission = ANY (coalesce(r.permissions, '{}')))
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_admin() FROM public, anon;
REVOKE ALL ON FUNCTION public.is_admin_superuser() FROM public, anon;
REVOKE ALL ON FUNCTION public.has_admin_permission(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_superuser() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_admin_permission(text) TO authenticated, service_role;

-- 5. Triggers -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_admin_roles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  NEW.name = btrim(NEW.name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_roles_updated_at ON public.admin_roles;
CREATE TRIGGER admin_roles_updated_at
  BEFORE INSERT OR UPDATE ON public.admin_roles
  FOR EACH ROW EXECUTE FUNCTION public.handle_admin_roles_updated_at();

-- Nama role ikut tersalin ke admin_whitelist.role_oprec agar label lama
-- (sidebar, dsb.) tetap konsisten.
CREATE OR REPLACE FUNCTION public.sync_admin_role_name_to_whitelist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE public.admin_whitelist SET role_oprec = NEW.name WHERE role_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_roles_sync_name ON public.admin_roles;
CREATE TRIGGER admin_roles_sync_name
  AFTER UPDATE OF name ON public.admin_roles
  FOR EACH ROW EXECUTE FUNCTION public.sync_admin_role_name_to_whitelist();

-- Proteksi admin_whitelist untuk perubahan dari dashboard (role authenticated):
--  * is_superadmin tidak bisa diubah/diberikan lewat aplikasi.
--  * Baris superadmin tidak bisa diubah atau dihapus lewat aplikasi.
--  * Email dinormalisasi, role_oprec mengikuti nama role.
CREATE OR REPLACE FUNCTION public.guard_admin_whitelist_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_name text;
BEGIN
  IF coalesce(auth.role(), '') = 'authenticated' THEN
    IF TG_OP = 'DELETE' THEN
      IF OLD.is_superadmin THEN
        RAISE EXCEPTION 'Akun superadmin (ketua/wakil ketua/developer) tidak dapat dihapus dari dashboard.';
      END IF;
      RETURN OLD;
    END IF;

    IF TG_OP = 'INSERT' AND NEW.is_superadmin THEN
      RAISE EXCEPTION 'Status superadmin hanya dapat diberikan langsung melalui database.';
    END IF;

    IF TG_OP = 'UPDATE' THEN
      -- role_id / role_oprec superadmin boleh berubah (rename/hapus role),
      -- karena superadmin tetap punya akses penuh tanpa role.
      IF OLD.is_superadmin AND (
        NEW.email IS DISTINCT FROM OLD.email
        OR NEW.is_active IS DISTINCT FROM OLD.is_active
        OR NEW.role_division IS DISTINCT FROM OLD.role_division
      ) THEN
        RAISE EXCEPTION 'Akun superadmin (ketua/wakil ketua/developer) tidak dapat diubah dari dashboard.';
      END IF;
      IF NEW.is_superadmin IS DISTINCT FROM OLD.is_superadmin THEN
        RAISE EXCEPTION 'Status superadmin hanya dapat diubah langsung melalui database.';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  NEW.email = lower(btrim(NEW.email));
  NEW.updated_at = timezone('utc'::text, now());

  IF NEW.role_id IS NOT NULL THEN
    SELECT name INTO v_role_name FROM public.admin_roles WHERE id = NEW.role_id;
    IF v_role_name IS NOT NULL THEN
      NEW.role_oprec = v_role_name;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_whitelist_guard ON public.admin_whitelist;
CREATE TRIGGER admin_whitelist_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.admin_whitelist
  FOR EACH ROW EXECUTE FUNCTION public.guard_admin_whitelist_changes();

-- 6. RLS admin_roles ----------------------------------------------------
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.admin_roles FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_roles TO authenticated;

DROP POLICY IF EXISTS admin_roles_select_admins ON public.admin_roles;
CREATE POLICY admin_roles_select_admins ON public.admin_roles
  FOR SELECT TO authenticated
  USING (public.is_active_admin());

DROP POLICY IF EXISTS admin_roles_insert_superadmin ON public.admin_roles;
CREATE POLICY admin_roles_insert_superadmin ON public.admin_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_superuser());

DROP POLICY IF EXISTS admin_roles_update_superadmin ON public.admin_roles;
CREATE POLICY admin_roles_update_superadmin ON public.admin_roles
  FOR UPDATE TO authenticated
  USING (public.is_admin_superuser())
  WITH CHECK (public.is_admin_superuser());

DROP POLICY IF EXISTS admin_roles_delete_superadmin ON public.admin_roles;
CREATE POLICY admin_roles_delete_superadmin ON public.admin_roles
  FOR DELETE TO authenticated
  USING (public.is_admin_superuser());

-- 7. RLS admin_whitelist ------------------------------------------------
--    Sebelumnya bisa dibaca anon (seluruh email admin terbuka publik).
--    Sekarang: user hanya bisa membaca barisnya sendiri, admin aktif
--    bisa membaca semua, dan hanya superadmin yang bisa mengubah.
DROP POLICY IF EXISTS "Allow public read whitelist" ON public.admin_whitelist;
DROP POLICY IF EXISTS "Allow read whitelist" ON public.admin_whitelist;

DROP POLICY IF EXISTS admin_whitelist_select_self_or_admin ON public.admin_whitelist;
CREATE POLICY admin_whitelist_select_self_or_admin ON public.admin_whitelist
  FOR SELECT TO authenticated
  USING (
    lower(email) = lower(coalesce((SELECT auth.jwt()) ->> 'email', ''))
    OR public.is_active_admin()
  );

DROP POLICY IF EXISTS admin_whitelist_insert_superadmin ON public.admin_whitelist;
CREATE POLICY admin_whitelist_insert_superadmin ON public.admin_whitelist
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_superuser());

DROP POLICY IF EXISTS admin_whitelist_update_superadmin ON public.admin_whitelist;
CREATE POLICY admin_whitelist_update_superadmin ON public.admin_whitelist
  FOR UPDATE TO authenticated
  USING (public.is_admin_superuser())
  WITH CHECK (public.is_admin_superuser());

DROP POLICY IF EXISTS admin_whitelist_delete_superadmin ON public.admin_whitelist;
CREATE POLICY admin_whitelist_delete_superadmin ON public.admin_whitelist
  FOR DELETE TO authenticated
  USING (public.is_admin_superuser());

-- 8. RLS tabel OPREC mengikuti hak akses --------------------------------
-- admin_settings
DROP POLICY IF EXISTS admin_settings_update_admins ON public.admin_settings;
CREATE POLICY admin_settings_update_admins ON public.admin_settings
  FOR UPDATE TO authenticated
  USING (public.has_admin_permission('oprec.settings'))
  WITH CHECK (public.has_admin_permission('oprec.settings'));

-- interview_questions (baca tetap untuk semua admin aktif)
DROP POLICY IF EXISTS interview_questions_cud_admin_dev ON public.interview_questions;
CREATE POLICY interview_questions_cud_admin_dev ON public.interview_questions
  FOR ALL TO authenticated
  USING (public.has_admin_permission('interview.manage'))
  WITH CHECK (public.has_admin_permission('interview.manage'));

DROP POLICY IF EXISTS interview_questions_select_active_admin ON public.interview_questions;
CREATE POLICY interview_questions_select_active_admin ON public.interview_questions
  FOR SELECT TO authenticated
  USING (public.is_active_admin());

-- applicants
DROP POLICY IF EXISTS applicants_admin_select ON public.applicants;
CREATE POLICY applicants_admin_select ON public.applicants
  FOR SELECT TO authenticated
  USING (public.has_admin_permission('applicants.view'));

DROP POLICY IF EXISTS applicants_admin_update ON public.applicants;
CREATE POLICY applicants_admin_update ON public.applicants
  FOR UPDATE TO authenticated
  USING (public.has_admin_permission('applicants.assess'))
  WITH CHECK (public.has_admin_permission('applicants.assess'));

DROP POLICY IF EXISTS applicants_admin_delete ON public.applicants;
CREATE POLICY applicants_admin_delete ON public.applicants
  FOR DELETE TO authenticated
  USING (public.has_admin_permission('applicants.delete'));

-- applicant_divisions
DROP POLICY IF EXISTS applicant_divisions_admin_select ON public.applicant_divisions;
CREATE POLICY applicant_divisions_admin_select ON public.applicant_divisions
  FOR SELECT TO authenticated
  USING (public.has_admin_permission('applicants.view'));

DROP POLICY IF EXISTS applicant_divisions_admin_delete ON public.applicant_divisions;
CREATE POLICY applicant_divisions_admin_delete ON public.applicant_divisions
  FOR DELETE TO authenticated
  USING (public.has_admin_permission('applicants.delete'));

-- assessments
DROP POLICY IF EXISTS assessments_admin_full_access ON public.assessments;
DROP POLICY IF EXISTS assessments_admin_select ON public.assessments;
DROP POLICY IF EXISTS assessments_admin_insert ON public.assessments;
DROP POLICY IF EXISTS assessments_admin_update ON public.assessments;
DROP POLICY IF EXISTS assessments_admin_delete ON public.assessments;

CREATE POLICY assessments_admin_select ON public.assessments
  FOR SELECT TO authenticated
  USING (public.has_admin_permission('applicants.view'));

CREATE POLICY assessments_admin_insert ON public.assessments
  FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_permission('applicants.assess'));

CREATE POLICY assessments_admin_update ON public.assessments
  FOR UPDATE TO authenticated
  USING (public.has_admin_permission('applicants.assess'))
  WITH CHECK (public.has_admin_permission('applicants.assess'));

CREATE POLICY assessments_admin_delete ON public.assessments
  FOR DELETE TO authenticated
  USING (public.has_admin_permission('applicants.delete'));

-- storage CV
DROP POLICY IF EXISTS admin_whitelist_select_cv_storage ON storage.objects;
CREATE POLICY admin_whitelist_select_cv_storage ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'cv-uploads' AND public.has_admin_permission('applicants.view'));

DROP POLICY IF EXISTS admin_whitelist_delete_cv_storage ON storage.objects;
CREATE POLICY admin_whitelist_delete_cv_storage ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'cv-uploads' AND public.has_admin_permission('applicants.delete'));
