-- Admin non-superadmin dengan hak "roles.assign_limited" boleh menambah/mencabut admin,
-- tetapi hanya untuk role yang ditandai superadmin sebagai is_assignable (mis. Teacher Magang).
-- Tidak bisa menyentuh superadmin, admin dengan role lain, ataupun membuat/mengubah role.
ALTER TABLE public.admin_roles DROP CONSTRAINT admin_roles_permissions_known;
ALTER TABLE public.admin_roles ADD CONSTRAINT admin_roles_permissions_known CHECK (
  permissions <@ ARRAY['applicants.view', 'applicants.assess', 'applicants.delete', 'oprec.settings',
    'interview.manage', 'interview.schedule', 'interview.sessions', 'announcements.send',
    'events.manage', 'grades.manage', 'roles.assign_limited', 'viewer.readonly']::text[]
);

ALTER TABLE public.admin_roles
  ADD COLUMN IF NOT EXISTS is_assignable boolean NOT NULL DEFAULT false;
UPDATE public.admin_roles SET is_assignable = true WHERE name = 'Teacher Magang';

-- Tambah / pindahkan admin ke role yang boleh diberikan
CREATE OR REPLACE FUNCTION public.assign_limited_role(p_email text, p_role_id uuid, p_full_name text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_name text := nullif(btrim(coalesce(p_full_name, '')), '');
  v_role record;
  v_target record;
  v_row public.admin_whitelist%ROWTYPE;
BEGIN
  IF NOT public.has_admin_permission('roles.assign_limited') THEN
    RAISE EXCEPTION 'Akses ditolak: Anda tidak memiliki hak menambah admin.';
  END IF;
  IF v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'Format email tidak valid.';
  END IF;

  SELECT id, name, is_assignable INTO v_role FROM public.admin_roles WHERE id = p_role_id;
  IF NOT FOUND OR NOT v_role.is_assignable THEN
    RAISE EXCEPTION 'Role ini tidak boleh diberikan dari menu terbatas.';
  END IF;

  SELECT w.id, w.is_superadmin, r.is_assignable AS role_assignable, w.role_id INTO v_target
  FROM public.admin_whitelist w LEFT JOIN public.admin_roles r ON r.id = w.role_id
  WHERE lower(w.email) = v_email;

  IF FOUND THEN
    IF v_target.is_superadmin THEN
      RAISE EXCEPTION 'Akun ini superadmin dan tidak bisa diubah.';
    END IF;
    IF v_target.role_id IS NOT NULL AND NOT coalesce(v_target.role_assignable, false) THEN
      RAISE EXCEPTION 'Akun ini sudah memiliki role lain yang hanya bisa diubah superadmin.';
    END IF;
    UPDATE public.admin_whitelist
    SET role_id = v_role.id, is_active = true, full_name = coalesce(v_name, full_name), updated_at = now()
    WHERE id = v_target.id
    RETURNING * INTO v_row;
  ELSE
    INSERT INTO public.admin_whitelist (email, full_name, role_division, role_id, role_oprec, is_active)
    VALUES (v_email, v_name, 'anggota', v_role.id, v_role.name, true)
    RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object('id', v_row.id, 'email', v_row.email, 'full_name', v_row.full_name,
    'role_division', v_row.role_division, 'role_id', v_row.role_id,
    'is_superadmin', v_row.is_superadmin, 'is_active', v_row.is_active);
END;
$$;
REVOKE ALL ON FUNCTION public.assign_limited_role(text, uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.assign_limited_role(text, uuid, text) TO authenticated;

-- Cabut akses admin yang role-nya boleh diberikan
CREATE OR REPLACE FUNCTION public.revoke_limited_role(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target record;
BEGIN
  IF NOT public.has_admin_permission('roles.assign_limited') THEN
    RAISE EXCEPTION 'Akses ditolak: Anda tidak memiliki hak mencabut admin.';
  END IF;

  SELECT w.email, w.is_superadmin, coalesce(r.is_assignable, false) AS role_assignable INTO v_target
  FROM public.admin_whitelist w LEFT JOIN public.admin_roles r ON r.id = w.role_id
  WHERE w.id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Anggota tidak ditemukan.';
  END IF;
  IF v_target.is_superadmin OR NOT v_target.role_assignable THEN
    RAISE EXCEPTION 'Akun ini hanya bisa dicabut oleh superadmin.';
  END IF;
  IF lower(v_target.email) = lower(coalesce(auth.jwt() ->> 'email', '')) THEN
    RAISE EXCEPTION 'Anda tidak dapat mencabut akses akun sendiri.';
  END IF;

  DELETE FROM public.admin_whitelist WHERE id = p_member_id;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_limited_role(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.revoke_limited_role(uuid) TO authenticated;
