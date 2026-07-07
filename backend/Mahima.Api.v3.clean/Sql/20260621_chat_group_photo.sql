ALTER TABLE public.chats
ADD COLUMN IF NOT EXISTS group_photo_url text;
