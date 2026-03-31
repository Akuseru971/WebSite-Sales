import { createListingBoostAdmin } from "@/lib/listingboost/supabase";

export const STORAGE_BUCKETS = {
  originals: "listingboost-originals",
  improved: "listingboost-improved",
  mockups: "listingboost-mockups",
  attachments: "listingboost-attachments"
} as const;

export async function uploadBufferToStorage(params: {
  bucket: (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];
  path: string;
  buffer: Buffer;
  contentType: string;
}) {
  const supabase = createListingBoostAdmin();
  const { error } = await supabase.storage.from(params.bucket).upload(params.path, params.buffer, {
    upsert: true,
    contentType: params.contentType,
    cacheControl: "3600"
  });

  if (error) {
    throw new Error(`Storage upload failed (${params.bucket}/${params.path}): ${error.message}`);
  }

  return {
    bucket: params.bucket,
    path: params.path
  };
}

export async function downloadStorageFile(params: {
  bucket: (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];
  path: string;
}) {
  const supabase = createListingBoostAdmin();
  const { data, error } = await supabase.storage.from(params.bucket).download(params.path);
  if (error || !data) {
    throw new Error(`Storage download failed (${params.bucket}/${params.path}): ${error?.message ?? "not found"}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function getPublicStorageUrl(params: {
  bucket: (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];
  path: string;
}) {
  const supabase = createListingBoostAdmin();
  const { data } = supabase.storage.from(params.bucket).getPublicUrl(params.path);
  return data.publicUrl;
}
