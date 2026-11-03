-- ==============================================================================
-- Migration: Add interview_answers JSONB to assessments table
-- Deskripsi: Menyimpan teks jawaban dan catatan wawancara per pertanyaan
--            ke dalam kolom JSONB pada tabel assessments.
-- ==============================================================================

ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS interview_answers JSONB DEFAULT '{}'::jsonb;

-- Update view_registrations agar menyertakan kolom interview_answers
CREATE OR REPLACE VIEW public.view_registrations WITH (security_invoker = true) AS
SELECT a.id,
    a.user_id,
    a.user_email,
    a.registration_code,
    a.status,
    a.current_step,
    a.full_name,
    a.nim,
    a.fakultas,
    a.prodi,
    a.angkatan,
    a.whatsapp,
    p1.division_id AS primary_division_id,
    d1.name AS primary_division_name,
    d1.category AS primary_division_category,
    p1.reason AS primary_reason,
    p2.division_id AS secondary_division_id,
    d2.name AS secondary_division_name,
    d2.category AS secondary_division_category,
    p2.reason AS secondary_reason,
    a.cv_file_name,
    a.cv_storage_path,
    NULL::boolean AS agreed_requirements,
    a.agreed_truth,
    a.submitted_at,
    a.created_at,
    a.updated_at,
    COALESCE(ass.status, 'pertimbangan'::character varying) AS assessment_status,
    ass.notes AS assessment_notes,
    ass.accepted_division_id,
    ad.name AS accepted_division_name,
    ad.category AS accepted_division_category,
    a.twibbon_url,
    a.portfolio_url,
    COALESCE(ass.interview_answers, '{}'::jsonb) AS interview_answers
   FROM applicants a
     LEFT JOIN applicant_divisions p1 ON p1.applicant_id = a.id AND p1.priority = 1
     LEFT JOIN divisions d1 ON d1.id::text = p1.division_id::text
     LEFT JOIN applicant_divisions p2 ON p2.applicant_id = a.id AND p2.priority = 2
     LEFT JOIN divisions d2 ON d2.id::text = p2.division_id::text
     LEFT JOIN assessments ass ON ass.applicant_id = a.id
     LEFT JOIN divisions ad ON ad.id::text = ass.accepted_division_id::text;

CREATE OR REPLACE VIEW public.registrations WITH (security_invoker = true) AS
SELECT * FROM public.view_registrations;

