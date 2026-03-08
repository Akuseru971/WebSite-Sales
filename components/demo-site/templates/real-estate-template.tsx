import type { DemoSiteRecord } from "@/lib/demo-sites/types";
import { HeroSection } from "@/components/demo-site/sections/hero-section";
import { SectionRenderer } from "@/components/demo-site/templates/section-renderer";
import { TemplateShell } from "@/components/demo-site/templates/template-shell";
import { getEnabledSections, getHeroSection } from "@/lib/demo-sites/content";

interface RealEstateTemplateProps {
  site: DemoSiteRecord;
}

export function RealEstateTemplate({ site }: RealEstateTemplateProps) {
  const hero = getHeroSection(site.generatedContent);
  const sections = getEnabledSections(site.generatedContent).filter((section) => section.type !== "hero");

  return (
    <TemplateShell site={site} className="bg-gradient-to-b from-zinc-100 via-stone-100/70 to-zinc-50">
      <HeroSection content={hero} />
      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </TemplateShell>
  );
}
