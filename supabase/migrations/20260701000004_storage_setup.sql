-- Storage bucket for task attachments (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false);

-- Storage path format: {auth.uid()}/{task_id}/{filename}
-- Signed URLs only — no public access

CREATE POLICY "Users can upload own attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'task-attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view accessible attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'task-attachments' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR get_user_role() = 'super_admin'
    )
  );

CREATE POLICY "Admins can manage all attachments" ON storage.objects
  FOR ALL USING (
    bucket_id = 'task-attachments' AND 
    get_user_role() = 'super_admin'
  );
