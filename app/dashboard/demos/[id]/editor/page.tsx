import { notFound } from "next/navigation";
import { DemoSiteEditor } from "@/components/demo-site/editor/demo-site-editor";
import { getDemoSiteById, listDemoSiteVersions } from "@/lib/demo-sites/repository";
import type { DemoSiteVersion } from "@/lib/demo-sites/types";
import { requireAuthenticatedUserId } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

interface DemoSiteEditorPageProps {
  params: Promise<{ id: string }>;
}

export default async function DemoSiteEditorPage({ params }: DemoSiteEditorPageProps) {
  await requireAuthenticatedUserId();
  const { id } = await params;
  const site = await getDemoSiteById(id);

  if (!site) {
    notFound();
  }

  let versions: DemoSiteVersion[] = [];
  try {
    versions = await listDemoSiteVersions(id);
  } catch {
    versions = [];
  }

  return <DemoSiteEditor site={site} initialVersions={versions} />;
}
