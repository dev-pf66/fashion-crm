-- ============================================================
-- STORAGE BUCKETS & POLICIES
-- Run this in Supabase SQL Editor to enable image uploads
-- ============================================================

-- Create buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('style-images', 'style-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('sample-photos', 'sample-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('tech-packs', 'tech-packs', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-docs', 'supplier-docs', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('style-files', 'style-files', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for public buckets
CREATE POLICY "Public read style-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'style-images');

CREATE POLICY "Public read sample-photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'sample-photos');

CREATE POLICY "Public read style-files" ON storage.objects
  FOR SELECT USING (bucket_id = 'style-files');

-- Authenticated users can upload/update/delete in all buckets
CREATE POLICY "Auth users upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id IN ('style-images', 'sample-photos', 'tech-packs', 'supplier-docs', 'style-files')
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Auth users update" ON storage.objects
  FOR UPDATE USING (
    bucket_id IN ('style-images', 'sample-photos', 'tech-packs', 'supplier-docs', 'style-files')
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Auth users delete" ON storage.objects
  FOR DELETE USING (
    bucket_id IN ('style-images', 'sample-photos', 'tech-packs', 'supplier-docs', 'style-files')
    AND auth.role() = 'authenticated'
  );

-- Authenticated read access for private buckets
CREATE POLICY "Auth users read tech-packs" ON storage.objects
  FOR SELECT USING (bucket_id = 'tech-packs' AND auth.role() = 'authenticated');

CREATE POLICY "Auth users read supplier-docs" ON storage.objects
  FOR SELECT USING (bucket_id = 'supplier-docs' AND auth.role() = 'authenticated');
