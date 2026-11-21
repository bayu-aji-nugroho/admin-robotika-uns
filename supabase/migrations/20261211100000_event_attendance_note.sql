-- Catatan per peserta acara (mis. alasan izin), diisi admin di halaman acara.
ALTER TABLE public.event_attendances
  ADD COLUMN IF NOT EXISTS note text CHECK (note IS NULL OR char_length(note) <= 300);
