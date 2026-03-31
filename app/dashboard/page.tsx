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

const featuredKpis: Array<keyof Awaited<ReturnType<typeof getDashboardKpis>>> = [
  "prospectsFound",
  "propertiesWithExtractedImages",
  "emailsSent"
];

const emptyKpis: Awaited<ReturnType<typeof getDashboardKpis>> = {
  prospectsFound: 0,
  prospectsWithPublicEmails: 0,
  propertiesWithExtractedImages: 0,
  improvedImagesGenerated: 0,
  mockupsGenerated: 0,
  emailsDrafted: 0,
  emailsSent: 0,
  opens: 0,
  clicks: 0,
  replies: 0
};

export default async function DashboardPage() {
  await requireAdminAuth();
  let kpis = emptyKpis;
  let hasDataError = false;

  try {
    kpis = await getDashboardKpis();
  } catch {
    hasDataError = true;
  }

  return (
    <AppShell title="Dashboard">
      {hasDataError ? (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Dashboard data is temporarily unavailable. Check environment variables and Supabase connectivity.
        </section>
      ) : null}

      <section className="fade-slide-in rounded-3xl border border-[#d7c5ad] bg-[linear-gradient(120deg,rgba(255,253,249,0.96),rgba(252,244,234,0.96))] p-5 shadow-[0_18px_45px_rgba(58,34,10,0.08)]">
        <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#88674c]">Snapshot</p>
            <h3 className="mt-2 font-[var(--font-heading)] text-3xl font-semibold text-[#2a1b0e]">Funnel performance</h3>
            <p className="mt-2 max-w-2xl text-sm text-[#6f5a43]">
              Vue d&apos;ensemble des volumes captés, de la transformation visuelle et des signaux d&apos;engagement email.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {featuredKpis.map((key) => (
              <article key={key} className="rounded-2xl border border-[#dcc9b0] bg-[#fff8ef] p-3 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8d6b4f]">{kpiLabels.find((item) => item.key === key)?.label}</p>
                <p className="mt-1 font-[var(--font-heading)] text-3xl font-semibold text-[#2f1f0f]">{kpis[key]}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpiLabels.map((item) => (
          <article
            key={item.key}
            className="fade-slide-in rounded-3xl border border-[#d9cbb8] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(251,244,234,0.9))] p-4 shadow-[0_12px_30px_rgba(56,34,12,0.08)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#87694f]">{item.label}</p>
            <p className="mt-2 font-[var(--font-heading)] text-3xl font-semibold text-[#2a1b0e]">{kpis[item.key]}</p>
          </article>
        ))}
      </div>

      <section className="fade-slide-in rounded-3xl border border-[#d6c5af] bg-[linear-gradient(160deg,rgba(255,251,246,0.98),rgba(247,239,229,0.95))] p-5 shadow-[0_16px_40px_rgba(53,31,10,0.08)]">
        <h3 className="font-[var(--font-heading)] text-2xl font-semibold text-[#26190d]">Workflow</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-2xl border border-[#dfcdb5] bg-[#fff8ef] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d6c50]">Step 1</p>
            <p className="mt-1 text-sm font-semibold text-[#2a1d12]">Discover prospects with public contacts.</p>
          </article>
          <article className="rounded-2xl border border-[#dfcdb5] bg-[#fff8ef] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d6c50]">Step 2</p>
            <p className="mt-1 text-sm font-semibold text-[#2a1d12]">Extract images from public property pages (robots-aware).</p>
          </article>
          <article className="rounded-2xl border border-[#dfcdb5] bg-[#fff8ef] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d6c50]">Step 3</p>
            <p className="mt-1 text-sm font-semibold text-[#2a1d12]">Enhance images with strict fidelity prompt rules.</p>
          </article>
          <article className="rounded-2xl border border-[#dfcdb5] bg-[#fff8ef] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d6c50]">Step 4</p>
            <p className="mt-1 text-sm font-semibold text-[#2a1d12]">Generate Google-style preview mockup.</p>
          </article>
          <article className="rounded-2xl border border-[#dfcdb5] bg-[#fff8ef] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d6c50]">Step 5</p>
            <p className="mt-1 text-sm font-semibold text-[#2a1d12]">Draft and send personalized outreach email.</p>
          </article>
          <article className="rounded-2xl border border-[#dfcdb5] bg-[#fff8ef] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d6c50]">Step 6</p>
            <p className="mt-1 text-sm font-semibold text-[#2a1d12]">Track status in CRM pipeline.</p>
          </article>
        </div>
      </section>
    </AppShell>
  );
}
