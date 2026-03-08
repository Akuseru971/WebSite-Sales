import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { listDemoSites } from "@/lib/demo-sites/repository";
import { categoryLabel } from "@/lib/demo-sites/renderers";
import { getHeroSection } from "@/lib/demo-sites/content";

export default async function PreviewLibraryPage() {
  const sites = await listDemoSites();

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-100 via-sand to-zinc-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Preview Library</p>
        <h1 className="mt-4 text-balance font-[var(--font-heading)] text-5xl leading-[0.98] text-ink md:text-6xl">Generated Demo Websites</h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-700 md:text-lg">
          Standalone preview routes rendered from structured JSON content, designed to simulate realistic premium websites.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {sites.map((site) => {
            const hero = getHeroSection(site.generatedContent);

            return (
              <article key={site.id} className="card-premium overflow-hidden">
              <div className="relative aspect-[16/9]">
                {hero.image ? (
                  <Image
                    src={hero.image}
                    alt={site.generatedContent.businessInfo.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-zinc-200 to-zinc-300" aria-hidden="true" />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-black/0" aria-hidden="true" />
              </div>
              <div className="p-6 md:p-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{categoryLabel[site.templateType]}</p>
                <h2 className="mt-2 text-balance font-[var(--font-heading)] text-4xl leading-tight text-ink">{site.generatedContent.businessInfo.name}</h2>
                <p className="mt-3 text-sm leading-relaxed text-zinc-700 md:text-base">{site.generatedContent.businessInfo.tagline ?? site.generatedContent.seo.metaDescription}</p>
                <Link
                  href={site.previewUrl}
                  className="mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-zinc-800"
                >
                  Open preview
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
