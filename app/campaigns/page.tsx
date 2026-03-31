import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/listingboost/app-shell";
import { requireAdminAuth } from "@/lib/listingboost/auth";
import { createCampaign, listCampaigns } from "@/lib/listingboost/repository";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  await requireAdminAuth();
  const campaigns = await listCampaigns();

  async function createAction(formData: FormData) {
    "use server";
    await createCampaign({
      name: String(formData.get("name") || "Untitled campaign"),
      variant: String(formData.get("variant") || "standard"),
      status: "draft",
      daily_cap: Number(formData.get("dailyCap") || 40)
    });
    revalidatePath("/campaigns");
  }

  return (
    <AppShell title="Campaigns">
      <form action={createAction} className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
        <h3 className="text-base font-semibold">Create campaign</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <input required name="name" placeholder="Campaign name" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          <select name="variant" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950">
            <option value="short">short</option>
            <option value="standard">standard</option>
            <option value="premium">premium</option>
          </select>
          <input name="dailyCap" type="number" defaultValue={40} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
          <button className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white" type="submit">Create</button>
        </div>
      </form>

      <section className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
        <h3 className="text-base font-semibold">Campaign list</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {campaigns.map((campaign) => (
            <li key={campaign.id} className="rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800">
              <p className="font-medium">{campaign.name}</p>
              <p className="text-xs text-zinc-500">{campaign.variant} • {campaign.status}</p>
            </li>
          ))}
          {!campaigns.length && <li className="text-zinc-500">No campaigns yet.</li>}
        </ul>
      </section>
    </AppShell>
  );
}
