-- Notifikasi pengumuman dari admin ke SEMUA calon anggota (lonceng di navbar website).
-- * applicant_notifications: isi pengumuman. Bisa dibaca semua pengguna yang login.
-- * notification_read_state: kapan terakhir tiap pengguna membuka lonceng
--   (belum dibaca = created_at > last_read_at). Satu baris per pengguna, bukan per notifikasi.
-- * Izin baru 'announcements.send' (Kirim pengumuman) untuk membuat/mengubah/menghapus.

ALTER TABLE public.admin_roles DROP CONSTRAINT IF EXISTS admin_roles_permissions_known;
ALTER TABLE public.admin_roles ADD CONSTRAINT admin_roles_permissions_known CHECK (
  permissions <@ ARRAY[
    'applicants.view', 'applicants.assess', 'applicants.delete', 'oprec.settings',
    'interview.manage', 'interview.schedule', 'interview.sessions', 'announcements.send'
  ]::text[]
);

CREATE TABLE IF NOT EXISTS public.applicant_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  link_url text,
  created_by uuid REFERENCES public.admin_whitelist(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.admin_whitelist(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT applicant_notifications_title_length CHECK (char_length(btrim(title)) BETWEEN 3 AND 120),
  CONSTRAINT applicant_notifications_body_length CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  CONSTRAINT applicant_notifications_link_format CHECK (
    link_url IS NULL OR (link_url ~* '^https?://[^\s]+$' AND char_length(link_url) <= 300)
  )
);
CREATE INDEX IF NOT EXISTS applicant_notifications_created_idx ON public.applicant_notifications (created_at DESC);

ALTER TABLE public.applicant_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.applicant_notifications FROM anon, authenticated;
GRANT SELECT ON public.applicant_notifications TO authenticated;

DROP POLICY IF EXISTS applicant_notifications_select_authenticated ON public.applicant_notifications;
CREATE POLICY applicant_notifications_select_authenticated ON public.applicant_notifications
  FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.notification_read_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.notification_read_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_read_state FROM anon, authenticated;

-- Validasi + normalisasi input pengumuman
CREATE OR REPLACE FUNCTION public.assert_can_send_announcements()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := public.current_admin_id();
BEGIN
  IF v_me IS NULL OR NOT public.has_admin_permission('announcements.send') THEN
    RAISE EXCEPTION 'Akses ditolak: Role Anda tidak memiliki hak kirim pengumuman.';
  END IF;
  RETURN v_me;
END;
$$;
REVOKE ALL ON FUNCTION public.assert_can_send_announcements() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.assert_can_send_announcements() TO authenticated;

CREATE OR REPLACE FUNCTION public.create_applicant_notification(p_title text, p_body text, p_link text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := public.assert_can_send_announcements();
  v_id uuid;
BEGIN
  INSERT INTO public.applicant_notifications (title, body, link_url, created_by, updated_by)
  VALUES (btrim(p_title), btrim(p_body), nullif(btrim(coalesce(p_link, '')), ''), v_me, v_me)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_applicant_notification(p_id uuid, p_title text, p_body text, p_link text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := public.assert_can_send_announcements();
BEGIN
  UPDATE public.applicant_notifications
  SET title = btrim(p_title),
      body = btrim(p_body),
      link_url = nullif(btrim(coalesce(p_link, '')), ''),
      updated_by = v_me,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengumuman tidak ditemukan.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_applicant_notification(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_can_send_announcements();
  DELETE FROM public.applicant_notifications WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengumuman tidak ditemukan.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.create_applicant_notification(text, text, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.update_applicant_notification(uuid, text, text, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.delete_applicant_notification(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_applicant_notification(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_applicant_notification(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_applicant_notification(uuid) TO authenticated;

-- Lonceng di website: pengumuman terbaru + jumlah belum dibaca, dalam satu panggilan
CREATE OR REPLACE FUNCTION public.get_my_notifications(p_limit int DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_last timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('items', '[]'::jsonb, 'unread_count', 0, 'last_read_at', NULL);
  END IF;

  SELECT last_read_at INTO v_last FROM public.notification_read_state WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'last_read_at', v_last,
    'unread_count', (
      SELECT count(*) FROM public.applicant_notifications n
      WHERE v_last IS NULL OR n.created_at > v_last
    ),
    'items', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', x.id, 'title', x.title, 'body', x.body, 'link_url', x.link_url,
        'created_at', x.created_at, 'updated_at', x.updated_at
      ) ORDER BY x.created_at DESC)
      FROM (
        SELECT * FROM public.applicant_notifications
        ORDER BY created_at DESC
        LIMIT greatest(1, least(coalesce(p_limit, 30), 100))
      ) x
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_notifications_read()
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now timestamptz := timezone('utc'::text, now());
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Silakan login terlebih dahulu.';
  END IF;
  INSERT INTO public.notification_read_state (user_id, last_read_at) VALUES (v_uid, v_now)
  ON CONFLICT (user_id) DO UPDATE SET last_read_at = EXCLUDED.last_read_at;
  RETURN v_now;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_notifications(int) FROM public, anon;
REVOKE ALL ON FUNCTION public.mark_notifications_read() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_notifications(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read() TO authenticated;
