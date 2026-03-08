import type { DemoSection, DemoSiteContent, HeroSectionContent, SectionType } from "./types";

export function getOrderedSections(content: DemoSiteContent): DemoSection[] {
  return [...content.sections].sort((a, b) => a.order - b.order);
}

export function getEnabledSections(content: DemoSiteContent): DemoSection[] {
  return getOrderedSections(content).filter((section) => section.enabled);
}

export function getSectionsByType<TType extends SectionType>(
  content: DemoSiteContent,
  type: TType
): Extract<DemoSection, { type: TType }>[] {
  return getEnabledSections(content).filter((section) => section.type === type) as Extract<DemoSection, { type: TType }>[];
}

export function getHeroSection(content: DemoSiteContent): HeroSectionContent {
  const heroSection = getOrderedSections(content).find((section) => section.type === "hero");
  if (heroSection) {
    return heroSection.content as HeroSectionContent;
  }

  return {
    title: content.businessInfo.name,
    subtitle: content.businessInfo.shortDescription ?? content.businessInfo.tagline ?? "Premium website concept",
    badge: content.businessInfo.category.replace("_", " "),
    primaryCta: { label: "Contact us", href: "#contact" },
    secondaryCta: { label: "Explore services", href: "#services" }
  };
}

export function upsertSection(
  content: DemoSiteContent,
  section: DemoSection,
  options?: { appendIfMissing?: boolean }
): DemoSiteContent {
  const existingIndex = content.sections.findIndex((current) => current.id === section.id);

  if (existingIndex >= 0) {
    const next = [...content.sections];
    next[existingIndex] = section;
    return { ...content, sections: next };
  }

  if (options?.appendIfMissing) {
    return { ...content, sections: [...content.sections, section] };
  }

  return content;
}
