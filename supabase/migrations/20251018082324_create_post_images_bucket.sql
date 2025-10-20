-- create a storage bucket for post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true);

-- enable RLS on storage objects (already done)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- policy: anyone can view images since bucket is public
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-images');

-- policy: anyone can upload images (for MVP) 
-- TODO: restrict later with auth)
CREATE POLICY "Public Upload"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'post-images'
    AND (storage.foldername(name))[1] = 'uploads'
);

-- policy: anyone can delete their own images 
-- TODO: restrict later with auth)
CREATE POLICY "Anyone can delete images"
ON storage.objects FOR DELETE
USING (bucket_id = 'post-images');
