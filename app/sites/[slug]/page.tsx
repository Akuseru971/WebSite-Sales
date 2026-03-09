import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DemoTemplateRenderer } from "@/components/demo-site/templates";
import { getDemoSiteBySlug } from "@/lib/demo-sites/repository";
import { deepDecodeHtmlEntities } from "@/lib/utils/html-entities";

export const dynamic = "force-dynamic";

interface SitePageProps {
  params: Promise<{ slug: string }>;
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

export default async function SitePage({ params }: SitePageProps) {
  const { slug } = await params;
  const site = await getDemoSiteBySlug(slug);

  if (!site) {
    notFound();
  }

  const decodedSite = {
    ...site,
    generatedContent: deepDecodeHtmlEntities(site.generatedContent),
  };

  return <DemoTemplateRenderer site={decodedSite} />;
}
