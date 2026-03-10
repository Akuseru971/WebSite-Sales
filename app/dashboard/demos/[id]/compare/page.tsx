import Link from "next/link";
import { notFound } from "next/navigation";
import { getDemoSiteById } from "@/lib/demo-sites/repository";

interface ComparePageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function CompareDemoSitePage({ params }: ComparePageProps) {
  const { id } = await params;
  const site = await getDemoSiteById(id);

  if (!site) {
    notFound();
  }

  const beforeUrl = `/sites/${site.slug}?variant=before`;
  const afterUrl = `/sites/${site.slug}?variant=after`;

  return (
    <main className="min-h-screen bg-zinc-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Comparaison visuelle</p>
          <h1 className="mt-1 font-[var(--font-heading)] text-3xl text-ink">Avant / Apres amelioration</h1>
          <p className="mt-1 text-sm text-zinc-600">{site.generatedContent.businessInfo.name}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={beforeUrl} target="_blank" className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800">
              Ouvrir version avant
            </Link>
            <Link href={afterUrl} target="_blank" className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
              Ouvrir version apres
            </Link>
            <Link href={`/dashboard/demos/${id}/editor?tab=optimization`} className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800">
              Ouvrir onglet optimization
            </Link>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-soft">
            <div className="border-b border-zinc-200 px-4 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Avant amelioration</p>
            </div>
            <iframe title="Avant amelioration" src={beforeUrl} className="h-[80vh] w-full bg-white" />
          </section>

          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-soft">
            <div className="border-b border-zinc-200 px-4 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Apres amelioration</p>
            </div>
            <iframe title="Apres amelioration" src={afterUrl} className="h-[80vh] w-full bg-white" />
          </section>
        </div>
      </div>
    </main>
  );
}
