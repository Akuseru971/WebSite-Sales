import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DemoTemplateRenderer } from "@/components/demo-site/templates";
import { getDemoSiteBySlug } from "@/lib/demo-sites/repository";
import { deepDecodeHtmlEntities } from "@/lib/utils/html-entities";

export const dynamic = "force-dynamic";

interface SitePageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ variant?: string }>;
}

export async function generateMetadata({ params }: SitePageProps): Promise<Metadata> {
  const { slug } = await params;
  const site = await getDemoSiteBySlug(slug);

  if (!site) {
    return {
      title: "Site not found",
    };
  }

  return {
    title: `${site.generatedContent.businessInfo.name}`,
    description:
      site.generatedContent.seo.metaDescription ??
      site.generatedContent.businessInfo.shortDescription ??
      "Generated business website",
  };
}

export default async function SitePage({ params, searchParams }: SitePageProps) {
  const { slug } = await params;
  const site = await getDemoSiteBySlug(slug);
  const query = await searchParams;

  if (!site) {
    notFound();
  }

  const variant = (query?.variant ?? "").toLowerCase();
  const beforeContent =
    (site.correctedSiteJson as typeof site.generatedContent | undefined) ??
    ((site.finalRenderDataJson as { content?: unknown } | undefined)?.content as typeof site.generatedContent | undefined) ??
    site.generatedContent;
  const afterContent =
    (site.optimizedSiteJson as typeof site.generatedContent | undefined) ??
    site.generatedContent;

  const selectedContent = variant === "before" ? beforeContent : afterContent;

  const decodedSite = {
    ...site,
    generatedContent: selectedContent.generatedHtmlPreview
      ? selectedContent
      : deepDecodeHtmlEntities(selectedContent),
  };

  return <DemoTemplateRenderer site={decodedSite} />;
}
