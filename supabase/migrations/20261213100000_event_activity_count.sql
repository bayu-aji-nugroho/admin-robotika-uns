-- Keaktifan peserta saat acara (jumlah bertanya/menjawab), diisi panitia di halaman acara
-- dan otomatis tampil di tab Penilaian.
ALTER TABLE public.event_attendances
  ADD COLUMN IF NOT EXISTS activity_count smallint NOT NULL DEFAULT 0
  CHECK (activity_count BETWEEN 0 AND 99);
