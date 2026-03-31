import Link from "next/link";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/listingboost/app-shell";
import { requireAdminAuth } from "@/lib/listingboost/auth";
import {
  createActivityLog,
  createProperty,
  getProspectById,
  listProperties,
  updateProspectStatus
} from "@/lib/listingboost/repository";
import { extractPropertyImages } from "@/lib/listingboost/image-extraction";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProspectDetailPage({ params }: Props) {
  await requireAdminAuth();
  const { id } = await params;
  const prospect = await getProspectById(id);
  const properties = (await listProperties()).filter((item) => item.prospect_id === id);

  async function updateStatusAction(formData: FormData) {
    "use server";
    const nextStatus = String(formData.get("status") || "new");
    await updateProspectStatus(id, nextStatus);
    await createActivityLog({ prospect_id: id, type: "status_updated", payload: { status: nextStatus } });
    revalidatePath(`/prospects/${id}`);
    revalidatePath("/prospects");
  }

  async function extractAction(formData: FormData) {
    "use server";
    const propertyName = String(formData.get("propertyName") || prospect.business_name);
    const propertyUrl = String(formData.get("propertyUrl") || prospect.website || "");

    if (!propertyUrl) {
      return;
    }

    const result = await extractPropertyImages({
      prospectId: id,
      propertyName,
      propertyUrl
    });

    if (result.blocked) {
      await createActivityLog({
        prospect_id: id,
        type: "extraction_blocked",
        payload: { message: result.message }
      });
    } else {
      await updateProspectStatus(id, "images_extracted");
      await createActivityLog({
        prospect_id: id,
        type: "images_extracted",
        payload: { propertyId: result.propertyId, count: result.extractedCount }
      });
    }

    revalidatePath(`/prospects/${id}`);
    revalidatePath("/properties");
  }

  async function addPropertyAction(formData: FormData) {
    "use server";
    await createProperty({
      prospect_id: id,
      property_name: String(formData.get("propertyName") || `${prospect.business_name} Listing`),
      property_url: String(formData.get("propertyUrl") || prospect.website || "") || null,
      address: String(formData.get("address") || "") || null,
      category: String(formData.get("category") || prospect.niche || "") || null
    });
    revalidatePath(`/prospects/${id}`);
    revalidatePath("/properties");
  }

  return (
    <AppShell title={prospect.business_name}>
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
          <h3 className="text-base font-semibold">Prospect profile</h3>
          <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-zinc-500">Email</dt><dd>{prospect.public_email || "-"}</dd>
            <dt className="text-zinc-500">Website</dt><dd className="truncate">{prospect.website || "-"}</dd>
            <dt className="text-zinc-500">LinkedIn</dt><dd className="truncate">{prospect.linkedin_url || "-"}</dd>
            <dt className="text-zinc-500">Instagram</dt><dd className="truncate">{prospect.instagram_url || "-"}</dd>
            <dt className="text-zinc-500">Status</dt><dd>{prospect.status}</dd>
          </dl>

          <form action={updateStatusAction} className="mt-4 flex gap-2">
            <select className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" name="status" defaultValue={prospect.status}>
              {[
                "new",
                "researched",
                "images_extracted",
                "mockup_generated",
                "email_drafted",
                "sent",
                "opened",
                "replied",
                "interested",
                "closed",
                "ignored"
              ].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <button className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white" type="submit">Update status</button>
          </form>
        </article>

        <article className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
          <h3 className="text-base font-semibold">Image extraction</h3>
          <p className="mt-1 text-xs text-zinc-500">Public pages only. If blocked by robots, fallback to manual screenshot upload.</p>
          <form action={extractAction} className="mt-3 space-y-2">
            <input className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" name="propertyName" placeholder="Property name" defaultValue={prospect.business_name} />
            <input className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" name="propertyUrl" placeholder="Public property URL" defaultValue={prospect.website || ""} />
            <button className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" type="submit">Extract listing images</button>
          </form>
        </article>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
        <h3 className="text-base font-semibold">Properties</h3>
        <form action={addPropertyAction} className="mt-3 grid gap-2 md:grid-cols-4">
          <input className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" name="propertyName" placeholder="Property name" />
          <input className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" name="propertyUrl" placeholder="Property URL" />
          <input className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" name="address" placeholder="Address" />
          <button className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900" type="submit">Add property</button>
        </form>

        <ul className="mt-4 space-y-2 text-sm">
          {properties.map((property) => (
            <li key={property.id} className="rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800">
              <Link className="font-medium text-sky-600 hover:underline" href={`/properties/${property.id}`}>
                {property.property_name}
              </Link>
              <p className="text-xs text-zinc-500">{property.property_url || "No URL"}</p>
            </li>
          ))}
          {!properties.length && <li className="text-zinc-500">No property yet.</li>}
        </ul>
      </section>
    </AppShell>
  );
}
