import { revalidatePath } from "next/cache";
import Link from "next/link";
import { AppShell } from "@/components/listingboost/app-shell";
import { requireAdminAuth } from "@/lib/listingboost/auth";
import { generateMockup } from "@/lib/listingboost/mockup";
import { listMockups, listProperties, getProspectById, createActivityLog, updateProspectStatus } from "@/lib/listingboost/repository";

export const dynamic = "force-dynamic";

export default async function MockupsPage() {
  await requireAdminAuth();
  const mockups = await listMockups();
  const properties = await listProperties();

  async function generateAction(formData: FormData) {
    "use server";
    const propertyId = String(formData.get("propertyId") || "");
    const property = properties.find((item) => item.id === propertyId);
    if (!property) return;

    const prospect = await getProspectById(property.prospect_id);
    const result = await generateMockup({
      propertyId,
      businessName: property.property_name,
      imageUrls: [],
      address: property.address || undefined,
      category: property.category || undefined,
      theme: (String(formData.get("theme") || "light") as "light" | "dark")
    });

    await createActivityLog({
      prospect_id: prospect.id,
      type: "mockup_generated",
      payload: { propertyId, mockupId: result.id, previewLink: result.publicPreviewLink }
    });
    await updateProspectStatus(prospect.id, "mockup_generated");

    revalidatePath("/mockups");
    revalidatePath("/prospects");
  }

  return (
    <AppShell title="Mockups">
      <form action={generateAction} className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
        <h3 className="text-base font-semibold">Generate Google-style mockup</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <select required name="propertyId" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950">
            <option value="">Select property</option>
            {properties.map((item) => (
              <option key={item.id} value={item.id}>{item.property_name}</option>
            ))}
          </select>
          <select name="theme" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950">
            <option value="light">light</option>
            <option value="dark">dark</option>
          </select>
          <button type="submit" className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white">Generate</button>
        </div>
      </form>

      <section className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
        <h3 className="text-base font-semibold">Generated mockups</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {mockups.map((item) => (
            <li key={item.id} className="rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800">
              <p className="font-medium">{item.id}</p>
              <p className="text-xs text-zinc-500">Theme: {item.theme}</p>
              <Link href={`/mockups/share/${item.public_token}`} className="text-sky-600 hover:underline">Open share preview</Link>
            </li>
          ))}
          {!mockups.length && <li className="text-zinc-500">No mockups yet.</li>}
        </ul>
      </section>
    </AppShell>
  );
}
