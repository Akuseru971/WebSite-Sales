import type { DemoSiteRecord } from "@/lib/demo-sites/types";
import { HeroSection } from "@/components/demo-site/sections/hero-section";
import { SectionRenderer } from "@/components/demo-site/templates/section-renderer";
import { TemplateShell } from "@/components/demo-site/templates/template-shell";
import { getEnabledSections, getHeroSection } from "@/lib/demo-sites/content";

interface RestaurantTemplateProps {
  site: DemoSiteRecord;
}

export function RestaurantTemplate({ site }: RestaurantTemplateProps) {
  const hero = getHeroSection(site.generatedContent);
  const sections = getEnabledSections(site.generatedContent).filter((section) => section.type !== "hero");

  return (
    <TemplateShell site={site} className="bg-gradient-to-b from-stone-50 via-[#f6efe7] to-[#f4ece3]">
      <HeroSection content={hero} />
      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </TemplateShell>
  );
}
