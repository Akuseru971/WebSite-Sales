import Link from "next/link";
import { SiteGenerationPlanner } from "@/components/demo-site/planner/site-generation-planner";
import { mockCommerceLeads } from "@/lib/leads/mock-leads";
import { listDemoSites } from "@/lib/demo-sites/repository";

export default async function HomePage() {
  const demoSites = await listDemoSites();
  const references = demoSites.map((site) => ({
    id: site.id,
    templateType: site.templateType,
    designStyle: site.designStyle,
    previewUrl: site.previewUrl,
    editorUrl: `/dashboard/demos/${site.id}/editor`,
    name: site.generatedContent.businessInfo.name,
    city: site.generatedContent.businessInfo.city
  }));

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-100 via-sand to-zinc-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Internal Demo Engine</p>
            <h1 className="mt-3 font-[var(--font-heading)] text-5xl leading-[0.95] text-ink md:text-6xl">
              Generation Workflow
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-700 md:text-base">
              Selection guidee pour cibler une ville, filtrer les commerces par categories, puis
              choisir les variantes de sites a generer pour chaque commerce.
            </p>
          </div>
          <Link
            href="/preview"
            className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 transition hover:-translate-y-0.5 hover:border-zinc-400"
          >
            Ouvrir la librairie de previews
          </Link>
        </div>

        <SiteGenerationPlanner leads={mockCommerceLeads} referenceSites={references} />
      </div>
    </main>
  );
}
