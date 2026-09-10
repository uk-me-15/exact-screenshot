CREATE TYPE public.care_mode AS ENUM ('allopathy','ayush');
CREATE TYPE public.encounter_status AS ENUM ('IN_PROGRESS','READY_FOR_DOCTOR','URGENT','IN_CONSULT','COMPLETED','CANCELLED');

CREATE TABLE public.encounters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kiosk_token text NOT NULL UNIQUE,
  display_token text NOT NULL,
  is_demo boolean NOT NULL DEFAULT false,
  status public.encounter_status NOT NULL DEFAULT 'IN_PROGRESS',
  care_mode public.care_mode,
  language text,
  language_label text,
  patient jsonb,
  identity_verification jsonb,
  consent jsonb,
  chief_complaint text,
  chief_complaint_label text,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ayush jsonb NOT NULL DEFAULT '[]'::jsonb,
  red_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  priority text NOT NULL DEFAULT 'ROUTINE',
  ai_summary text,
  doctor_notes text,
  doctor_id uuid,
  intake_seconds integer,
  kiosk_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  completed_at timestamptz
);

CREATE INDEX encounters_status_idx ON public.encounters (status, created_at DESC);

CREATE TABLE public.encounter_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  encounter_id uuid NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  storage_path text NOT NULL,
  kind text NOT NULL DEFAULT 'Other',
  processing_status text NOT NULL DEFAULT 'PENDING',
  ocr_provider text,
  ocr_text text,
  ocr_structured jsonb,
  ocr_confidence numeric,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX encounter_documents_encounter_idx ON public.encounter_documents (encounter_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.encounters TO authenticated;
GRANT ALL ON public.encounters TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.encounter_documents TO authenticated;
GRANT ALL ON public.encounter_documents TO service_role;

ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounter_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read encounters" ON public.encounters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can update encounters" ON public.encounters FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Staff can read encounter documents" ON public.encounter_documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can read encounter files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'encounter-documents');

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER encounters_touch_updated_at BEFORE UPDATE ON public.encounters
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();