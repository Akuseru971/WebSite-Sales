import type { DemoSiteRecord } from "@/lib/demo-sites/types";
import { AdaptiveTemplate } from "@/components/demo-site/templates/adaptive-template";
import { renderGeneratedHtmlPreview } from "@/components/demo-site/templates/generated-html-preview";
import { PremiumRestaurantTemplate } from "@/components/demo-site/templates/premium-restaurant-template";

interface DemoTemplateRendererProps {
  site: DemoSiteRecord;
}

export function DemoTemplateRenderer({ site }: DemoTemplateRendererProps) {
  if (site.generatedContent.restaurantContent) {
    return <PremiumRestaurantTemplate site={site} />;
  }

  const hasSourceWebsite = Boolean(site.generatedContent.sourceReconstructedHtml);
  const htmlPreview = site.generatedContent.generatedHtmlPreview;

  if (hasSourceWebsite && htmlPreview?.html) {
    return renderGeneratedHtmlPreview(htmlPreview);
  }

  if (hasSourceWebsite) {
    return <AdaptiveTemplate site={site} />;
  }

  return <AdaptiveTemplate site={site} />;
}
