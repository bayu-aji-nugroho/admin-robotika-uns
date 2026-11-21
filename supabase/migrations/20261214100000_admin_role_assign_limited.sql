-- Role "admin" boleh menambah/mencabut admin dengan role yang ditandai boleh diberikan (mis. Teacher Magang)
UPDATE public.admin_roles
SET permissions = array_append(permissions, 'roles.assign_limited'), updated_at = now()
WHERE name = 'admin' AND NOT ('roles.assign_limited' = ANY (permissions));
