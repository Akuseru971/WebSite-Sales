import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-mesh-soft px-6 py-20">
      <div className="premium-glass w-full max-w-2xl rounded-3xl border border-white/60 p-8 shadow-premium md:p-12">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">Internal Demo Engine</p>
        <h1 className="font-[var(--font-heading)] text-4xl text-ink md:text-5xl">Premium Website Preview System</h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-700 md:text-base">
          This workspace focuses on high-conviction, category-aware demo websites rendered from structured JSON content.
        </p>
        <Link
          href="/preview"
          className="mt-8 inline-flex items-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800"
        >
          Open Preview Library
        </Link>
      </div>
    </main>
  );
}
