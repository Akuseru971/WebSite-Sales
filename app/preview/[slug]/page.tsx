import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DemoTemplateRenderer } from "@/components/demo-site/templates";
import { getDemoSiteBySlug } from "@/lib/demo-sites/repository";

export const dynamic = "force-dynamic";

interface PreviewPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PreviewPageProps): Promise<Metadata> {
  const { slug } = await params;
  const site = await getDemoSiteBySlug(slug);

  if (!site) {
    return {
      title: "Demo preview not found"
    };
  }

  return {
    title: `${site.generatedContent.businessInfo.name} | Demo Preview`,
    description:
      site.generatedContent.seo.metaDescription ??
      site.generatedContent.businessInfo.shortDescription ??
      "Generated demo preview"
  };
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { slug } = await params;
  const site = await getDemoSiteBySlug(slug);

  if (!site) {
    notFound();
  }

  return <DemoTemplateRenderer site={site} />;
}
