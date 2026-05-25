import { createClient } from '@/lib/supabase/client';

export async function uploadTradeScreenshot(userId: string, file: File): Promise<string | null> {
  const supabase = createClient();
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `${userId}/${timestamp}-${safeName}`;

  const { error } = await supabase.storage
    .from('trade-screenshots')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error('Screenshot upload failed:', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('trade-screenshots')
    .getPublicUrl(path);

  return urlData.publicUrl;
}
