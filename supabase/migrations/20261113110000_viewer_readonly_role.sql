-- Izin khusus 'viewer.readonly' (Viewer - hanya lihat):
-- * Bisa membuka semua menu & melihat semua data (otomatis mendapat akses baca 'applicants.view').
-- * Tidak bisa digabung dengan izin lain, sehingga role Viewer dijamin tidak dapat mengubah apa pun.
-- * Nomor WhatsApp pewawancara kini juga butuh izin jadwal (sebelumnya semua admin bisa mengubah miliknya).

ALTER TABLE public.admin_roles DROP CONSTRAINT IF EXISTS admin_roles_permissions_known;
ALTER TABLE public.admin_roles ADD CONSTRAINT admin_roles_permissions_known CHECK (
  permissions <@ ARRAY[
    'applicants.view', 'applicants.assess', 'applicants.delete', 'oprec.settings',
    'interview.manage', 'interview.schedule', 'interview.sessions', 'announcements.send',
    'viewer.readonly'
  ]::text[]
);

ALTER TABLE public.admin_roles DROP CONSTRAINT IF EXISTS admin_roles_viewer_exclusive;
ALTER TABLE public.admin_roles ADD CONSTRAINT admin_roles_viewer_exclusive CHECK (
  NOT ('viewer.readonly' = ANY (permissions)) OR permissions = ARRAY['viewer.readonly']::text[]
);

CREATE OR REPLACE FUNCTION public.has_admin_permission(p_permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_whitelist aw
    LEFT JOIN public.admin_roles r ON r.id = aw.role_id
    WHERE lower(aw.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND aw.is_active = true
      AND (
        aw.is_superadmin = true
        OR p_permission = ANY (coalesce(r.permissions, '{}'))
        -- Viewer: akses baca saja
        OR (p_permission = 'applicants.view' AND 'viewer.readonly' = ANY (coalesce(r.permissions, '{}')))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_id_has_permission(p_admin uuid, p_permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_whitelist aw
    LEFT JOIN public.admin_roles r ON r.id = aw.role_id
    WHERE aw.id = p_admin AND aw.is_active = true
      AND (
        aw.is_superadmin = true
        OR p_permission = ANY (coalesce(r.permissions, '{}'))
        OR (p_permission = 'applicants.view' AND 'viewer.readonly' = ANY (coalesce(r.permissions, '{}')))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.set_interview_whatsapp(p_phone text, p_admin uuid DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := public.current_admin_id();
  v_target uuid;
  v_digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  v_target := coalesce(p_admin, v_me);
  IF v_target <> v_me AND NOT public.is_admin_superuser() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya superadmin yang dapat mengubah nomor admin lain.';
  END IF;
  IF v_target = v_me AND NOT public.has_admin_permission('interview.schedule') THEN
    RAISE EXCEPTION 'Akses ditolak: Role Anda tidak memiliki hak jadwal wawancara.';
  END IF;

  IF v_digits = '' THEN
    v_digits := NULL;
  ELSIF v_digits LIKE '0%' THEN
    v_digits := '62' || substr(v_digits, 2);
  ELSIF v_digits LIKE '8%' THEN
    v_digits := '62' || v_digits;
  END IF;

  IF v_digits IS NOT NULL AND v_digits !~ '^62[0-9]{8,13}$' THEN
    RAISE EXCEPTION 'Nomor WhatsApp tidak valid. Gunakan format 08xx atau 62xx.';
  END IF;

  UPDATE public.admin_whitelist
  SET interview_whatsapp = v_digits, updated_at = timezone('utc'::text, now())
  WHERE id = v_target;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Admin tidak ditemukan.';
  END IF;

  RETURN v_digits;
END;
$$;
