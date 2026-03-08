import type { DemoSiteRecord } from "@/lib/demo-sites/types";
import { AdaptiveTemplate } from "@/components/demo-site/templates/adaptive-template";

interface DemoTemplateRendererProps {
  site: DemoSiteRecord;
}

export function DemoTemplateRenderer({ site }: DemoTemplateRendererProps) {
  return <AdaptiveTemplate site={site} />;
}
