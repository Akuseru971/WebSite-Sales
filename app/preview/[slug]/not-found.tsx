import Link from "next/link";

export default function PreviewNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-sand px-4">
      <div className="max-w-lg rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Preview</p>
        <h1 className="mt-3 font-[var(--font-heading)] text-4xl text-ink">Demo not found</h1>
        <p className="mt-4 text-sm text-zinc-700">The requested preview slug does not exist or has been archived.</p>
        <Link
          href="/preview"
          className="mt-7 inline-flex rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Back to library
        </Link>
      </div>
    </main>
  );
}
