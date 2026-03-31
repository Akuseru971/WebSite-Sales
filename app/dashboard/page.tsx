import { AppShell } from "@/components/listingboost/app-shell";
import { requireAdminAuth } from "@/lib/listingboost/auth";
import { getDashboardKpis } from "@/lib/listingboost/repository";

export const dynamic = "force-dynamic";

const kpiLabels: Array<{ key: keyof Awaited<ReturnType<typeof getDashboardKpis>>; label: string }> = [
  { key: "prospectsFound", label: "Prospects found" },
  { key: "prospectsWithPublicEmails", label: "Prospects with public emails" },
  { key: "propertiesWithExtractedImages", label: "Properties with extracted images" },
  { key: "improvedImagesGenerated", label: "Improved images generated" },
  { key: "mockupsGenerated", label: "Mockups generated" },
  { key: "emailsDrafted", label: "Emails drafted" },
  { key: "emailsSent", label: "Emails sent" },
  { key: "opens", label: "Opens" },
  { key: "clicks", label: "Clicks" },
  { key: "replies", label: "Replies" }
];

export default async function DashboardPage() {
  await requireAdminAuth();
  const kpis = await getDashboardKpis();

  return (
    <AppShell title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpiLabels.map((item) => (
          <article key={item.key} className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
            <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold">{kpis[item.key]}</p>
          </article>
        ))}
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white/80 p-5 dark:border-zinc-800 dark:bg-zinc-900/70">
        <h3 className="text-lg font-semibold">Workflow</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-600 dark:text-zinc-300">
          <li>Discover prospects with public contacts.</li>
          <li>Extract images from public property pages (robots-aware).</li>
          <li>Enhance images with strict fidelity prompt rules.</li>
          <li>Generate Google-style preview mockup.</li>
          <li>Draft and send personalized outreach email.</li>
          <li>Track status in CRM pipeline.</li>
        </ol>
      </section>
    </AppShell>
  );
}
