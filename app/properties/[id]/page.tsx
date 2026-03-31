import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/listingboost/app-shell";
import { requireAdminAuth } from "@/lib/listingboost/auth";
import {
  getPropertyById,
  listPropertyImages,
  listImprovedImages,
  createActivityLog
} from "@/lib/listingboost/repository";
import { enhanceExtractedImage } from "@/lib/listingboost/image-enhancement";
import { saveManualImageUpload } from "@/lib/listingboost/image-extraction";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailPage({ params }: Props) {
  await requireAdminAuth();
  const { id } = await params;
  const property = await getPropertyById(id);
  const extracted = await listPropertyImages(id);
  const improved = await listImprovedImages(id);

  async function enhanceAction(formData: FormData) {
    "use server";
    const extractedImageId = String(formData.get("extractedImageId") || "");
    const storagePath = String(formData.get("storagePath") || "");
    const roomType = String(formData.get("roomType") || "unknown");
    const prompt = String(formData.get("customPrompt") || "") || undefined;

    if (!extractedImageId || !storagePath) {
      return;
    }

    const version = improved.filter((item) => item.extracted_image_id === extractedImageId).length + 1;
    await enhanceExtractedImage({
      extractedImageId,
      originalStoragePath: storagePath,
      roomType,
      customPrompt: prompt,
      version
    });

    await createActivityLog({
      prospect_id: property.prospect_id,
      type: "image_enhanced",
      payload: { propertyId: id, extractedImageId, version }
    });

    revalidatePath(`/properties/${id}`);
  }

  async function manualUploadAction(formData: FormData) {
    "use server";
    const file = formData.get("file");
    if (!(file instanceof File) || !file.size) {
      return;
    }

    const roomType = String(formData.get("roomType") || "unknown");
    await saveManualImageUpload({
      propertyId: id,
      file,
      roomType
    });

    await createActivityLog({
      prospect_id: property.prospect_id,
      type: "manual_image_uploaded",
      payload: { propertyId: id, fileName: file.name, roomType }
    });

    revalidatePath(`/properties/${id}`);
  }

  return (
    <AppShell title={property.property_name}>
      <section className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{property.property_url || "No property URL"}</p>
        <p className="mt-1 text-xs text-zinc-500">Strict fidelity mode: same room, same furniture, same angle, only visual quality improvements.</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
          <h3 className="text-base font-semibold">Extracted images</h3>
          <form action={manualUploadAction} className="mt-3 rounded-xl border border-dashed border-zinc-300 p-3 dark:border-zinc-700" encType="multipart/form-data">
            <p className="text-xs text-zinc-500">Fallback upload: screenshot, drag and drop, or pasted image file.</p>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              <input type="file" name="file" accept="image/*" className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 md:col-span-2" required />
              <input name="roomType" placeholder="room type (optional)" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
            </div>
            <button type="submit" className="mt-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">Upload manual image</button>
          </form>

          <div className="mt-3 space-y-3">
            {extracted.map((image) => (
              <form key={image.id} action={enhanceAction} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                <input type="hidden" name="extractedImageId" value={image.id} />
                <input type="hidden" name="storagePath" value={image.storage_path} />
                <p className="text-xs text-zinc-500">{image.storage_path}</p>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  <input name="roomType" defaultValue={image.room_type} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
                  <input name="customPrompt" placeholder="Optional stricter fidelity prompt" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 md:col-span-2" />
                </div>
                <button type="submit" className="mt-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white">Enhance image</button>
              </form>
            ))}
            {!extracted.length && <p className="text-sm text-zinc-500">No extracted images yet.</p>}
          </div>
        </article>

        <article className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
          <h3 className="text-base font-semibold">Improved images</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {improved.map((image) => (
              <li key={image.id} className="rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <p className="font-medium">Version {image.version}</p>
                <p className="text-xs text-zinc-500">{image.storage_path}</p>
              </li>
            ))}
            {!improved.length && <li className="text-zinc-500">No improved image yet.</li>}
          </ul>
        </article>
      </section>
    </AppShell>
  );
}
