import { notFound } from "next/navigation";
import { getMockupByToken } from "@/lib/listingboost/repository";
import { getPublicStorageUrl, STORAGE_BUCKETS } from "@/lib/listingboost/storage";

interface Props {
  params: Promise<{ token: string }>;
}

export const dynamic = "force-dynamic";

export default async function ShareMockupPage({ params }: Props) {
  const { token } = await params;

  try {
    const mockup = await getMockupByToken(token);
    const htmlUrl = getPublicStorageUrl({
      bucket: STORAGE_BUCKETS.mockups,
      path: mockup.html_storage_path
    });

    return (
      <main className="min-h-screen bg-zinc-950 p-4">
        <div className="mx-auto max-w-5xl rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
          <p className="mb-2 text-xs uppercase tracking-[0.12em] text-zinc-400">ListingBoost Preview</p>
          <iframe title="Mockup preview" src={htmlUrl} className="h-[78vh] w-full rounded-xl border border-zinc-800 bg-white" />
        </div>
      </main>
    );
  } catch {
    notFound();
  }
}
