import Link from "next/link";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/listingboost/app-shell";
import { requireAdminAuth } from "@/lib/listingboost/auth";
import { createProspect, listProspects } from "@/lib/listingboost/repository";
import { discoverProspects } from "@/lib/listingboost/discovery";
import { toProspectInsert } from "@/lib/listingboost/mappers";

export const dynamic = "force-dynamic";

export default async function ProspectsPage() {
  await requireAdminAuth();
  const prospects = await listProspects();

  async function discoverAction(formData: FormData) {
    "use server";

    const payload = {
      query: String(formData.get("query") || ""),
      city: String(formData.get("city") || ""),
      country: String(formData.get("country") || ""),
      niche: String(formData.get("niche") || ""),
      websiteUrl: String(formData.get("websiteUrl") || "") || undefined,
      limit: Number(formData.get("limit") || 10)
    };

    const rows = await discoverProspects(payload);
    for (const item of rows) {
      await createProspect(
        toProspectInsert({
          businessName: item.businessName,
          niche: payload.niche,
          city: item.city,
          country: item.country,
          website: item.website,
          publicEmail: item.publicEmail,
          linkedinUrl: item.linkedinUrl,
          instagramUrl: item.instagramUrl,
          contactPageUrl: item.contactPageUrl,
          sourceQuery: item.sourceQuery,
          sourceUrl: item.sourceUrl,
          source: item.source,
          confidenceScore: item.confidenceScore,
          status: "researched"
        })
      );
    }

    revalidatePath("/prospects");
  }

  async function createManualAction(formData: FormData) {
    "use server";
    await createProspect(
      toProspectInsert({
        businessName: String(formData.get("businessName") || ""),
        niche: String(formData.get("niche") || ""),
        city: String(formData.get("city") || ""),
        country: String(formData.get("country") || ""),
        website: String(formData.get("website") || ""),
        publicEmail: String(formData.get("publicEmail") || ""),
        source: "manual",
        status: "new"
      })
    );
    revalidatePath("/prospects");
  }

  return (
    <AppShell title="Prospects">
      <section className="grid gap-4 lg:grid-cols-2">
        <form action={discoverAction} className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
          <h3 className="text-base font-semibold">Prospect discovery</h3>
          <p className="text-xs text-zinc-500">Use public URLs (one per line in query) or one website URL.</p>
          <div className="mt-3 space-y-2 text-sm">
            <input className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" name="niche" placeholder="Niche (serviced apartments...)" />
            <input className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" name="city" placeholder="City" />
            <input className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" name="country" placeholder="Country" />
            <input className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" name="websiteUrl" placeholder="Single website URL (optional)" />
            <textarea className="h-24 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" name="query" placeholder="Manual query input. You can paste public URLs line by line for MVP reliability." />
            <input className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" defaultValue={10} min={1} max={50} name="limit" type="number" />
          </div>
          <button className="mt-3 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white" type="submit">Discover & save</button>
        </form>

        <form action={createManualAction} className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
          <h3 className="text-base font-semibold">Manual prospect creation</h3>
          <div className="mt-3 space-y-2 text-sm">
            <input required className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" name="businessName" placeholder="Business name" />
            <input className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" name="niche" placeholder="Niche" />
            <input className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" name="city" placeholder="City" />
            <input className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" name="country" placeholder="Country" />
            <input className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" name="website" placeholder="Website" />
            <input className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" name="publicEmail" placeholder="Public email" />
          </div>
          <button className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" type="submit">Add prospect</button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/70">
        <table className="w-full text-sm">
          <thead className="bg-zinc-100/80 text-left text-xs uppercase tracking-[0.08em] text-zinc-500 dark:bg-zinc-800/70">
            <tr>
              <th className="px-3 py-2">Business</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {prospects.map((item) => (
              <tr key={item.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-3 py-2">
                  <Link className="font-medium text-sky-600 hover:underline" href={`/prospects/${item.id}`}>
                    {item.business_name}
                  </Link>
                </td>
                <td className="px-3 py-2">{[item.city, item.country].filter(Boolean).join(", ") || "-"}</td>
                <td className="px-3 py-2">{item.public_email || "-"}</td>
                <td className="px-3 py-2">{item.status}</td>
                <td className="px-3 py-2">{Math.round((item.confidence_score || 0) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
