import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const BUCKET = 'bol-documents';

/** Accepts either a stored object path or a legacy public URL and returns the object path. */
export function bolObjectPath(stored: string): string {
  const marker = `/${BUCKET}/`;
  const idx = stored.indexOf(marker);
  const path = idx >= 0 ? stored.slice(idx + marker.length) : stored;
  return decodeURIComponent(path.split('?')[0]);
}

/** Opens a BOL document from the private bucket via a short-lived signed URL. */
export async function openBolDocument(stored: string | null | undefined) {
  if (!stored) return;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(bolObjectPath(stored), 60);
  if (error || !data?.signedUrl) {
    toast.error(error?.message || 'Could not open BOL document');
    return;
  }
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}
