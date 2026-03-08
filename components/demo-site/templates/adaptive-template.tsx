import type { DemoSiteRecord } from "@/lib/demo-sites/types";
import { SectionRenderer } from "@/components/demo-site/templates/section-renderer";
import { TemplateShell } from "@/components/demo-site/templates/template-shell";
import { getEnabledSections, getHeroSection } from "@/lib/demo-sites/content";
import { AdaptiveHero } from "@/components/demo-site/templates/adaptive-hero";

interface AdaptiveTemplateProps {
  site: DemoSiteRecord;
}

export function AdaptiveTemplate({ site }: AdaptiveTemplateProps) {
  const hero = getHeroSection(site.generatedContent);
  const sections = getEnabledSections(site.generatedContent).filter((section) => section.type !== "hero");

  return (
    <TemplateShell site={site}>
      <AdaptiveHero content={hero} composition={site.generatedContent.adaptiveSiteJson} />
      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} composition={site.generatedContent.adaptiveSiteJson} />
      ))}
    </TemplateShell>
  );
}
