-- Divisi bawaan admin di form Jadwal Magang (sesuai role panitia OPREC).
-- Isi: id divisi, atau 'teknis' = semua divisi teknis (Werkudara & Cakrawala). NULL = tanpa bawaan.
ALTER TABLE public.admin_whitelist ADD COLUMN IF NOT EXISTS internship_division text;

UPDATE public.admin_whitelist SET internship_division = 'teknis'
WHERE lower(email) IN ('muhammadnurarif18@student.uns.ac.id', 'haarithanamta@student.uns.ac.id');
UPDATE public.admin_whitelist SET internship_division = 'humas'
WHERE lower(email) = 'dwikurnia12@student.uns.ac.id';
UPDATE public.admin_whitelist SET internship_division = 'administrasi'
WHERE lower(email) = 'sulthanhafizh2006@student.uns.ac.id';
UPDATE public.admin_whitelist SET internship_division = 'bendahara'
WHERE lower(email) = 'devikusumawati@student.uns.ac.id';
