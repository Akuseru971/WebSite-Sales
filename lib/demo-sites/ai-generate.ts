import type { BusinessCategory, DemoSiteContent, DemoSiteStyle, DemoSection } from "./types";
import { SEEDED_DEMO_SITES } from "./defaults";
import { updateDemoSiteJsonWithAI } from "./ai-edit";
import type { EnrichedCommerceLead } from "@/lib/leads/enrichment";
import type { StructuredBusinessExtraction } from "@/lib/leads/extraction/types";
import { validateDemoSiteContent } from "./validation";
import { inferLocaleProfile } from "@/lib/i18n/locale";

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getBaseTemplate(category: BusinessCategory): DemoSiteContent {
  const fallback = SEEDED_DEMO_SITES.find((site) => site.templateType === category) ?? SEEDED_DEMO_SITES[0];
  return deepClone(fallback.generatedContent);
}

function findSection<TType extends DemoSection["type"]>(
  content: DemoSiteContent,
  type: TType
): Extract<DemoSection, { type: TType }> | undefined {
  return content.sections.find((section) => section.type === type) as
    | Extract<DemoSection, { type: TType }>
    | undefined;
}

function clampText(text: string | undefined, maxLength = 260): string | undefined {
  if (!text) {
    return undefined;
  }

  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function getPrimaryCopyFromExtraction(extracted?: StructuredBusinessExtraction): {
  heroTitle?: string;
  heroSubtitle?: string;
  aboutParagraph?: string;
  serviceParagraphs: string[];
  ctaText?: string;
} {
  if (!extracted) {
    return { serviceParagraphs: [] };
  }

  const heroTitle = extracted.keyHeadings.find((heading) => heading.length >= 8);
  const heroSubtitle = extracted.aboutText[0] ?? extracted.pages.find((page) => page.description)?.description;
  const aboutParagraph = extracted.aboutText[1] ?? extracted.aboutText[0];
  const serviceParagraphs = extracted.serviceDescriptions.slice(0, 6);
  const ctaText = extracted.ctaPhrases.find((phrase) => phrase.length >= 6);

  return {
    heroTitle: clampText(heroTitle, 90),
    heroSubtitle: clampText(heroSubtitle, 220),
    aboutParagraph: clampText(aboutParagraph, 320),
    serviceParagraphs,
    ctaText: clampText(ctaText, 80),
  };
}

function applyLeadFacts(content: DemoSiteContent, params: {
  category: BusinessCategory;
  style: DemoSiteStyle;
  enriched: EnrichedCommerceLead;
}): DemoSiteContent {
  const { enriched, category } = params;
  const lead = enriched.lead;
  const locale = enriched.locale ?? inferLocaleProfile(lead.country);
  const extracted = enriched.extractedWebsite;
  const extractedCopy = getPrimaryCopyFromExtraction(extracted);
  const next = deepClone(content);

  next.businessInfo.name = lead.businessName;
  next.businessInfo.category = category;
  next.businessInfo.city = lead.city;
  next.businessInfo.country = lead.country ?? locale.country;
  next.businessInfo.address = lead.address;
  next.businessInfo.phone = lead.phone;
  const normalizedBusinessName = lead.businessName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "");
  const autoEmail = normalizedBusinessName
    ? `contact@${normalizedBusinessName}.${locale.ccTld}`
    : undefined;

  next.businessInfo.email = lead.email ?? autoEmail;
  next.businessInfo.shortDescription = extractedCopy.heroSubtitle ?? enriched.inferredDescription;
  next.businessInfo.tagline = extractedCopy.heroSubtitle ?? enriched.inferredDescription;

  next.contact.contactName = lead.businessName;
  next.contact.phone = lead.phone;
  next.contact.email = lead.email ?? autoEmail;
  next.contact.openingHours = lead.openingHours ? [lead.openingHours] : next.contact.openingHours;

  const hero = findSection(next, "hero");
  if (hero) {
    hero.content.title = extractedCopy.heroTitle ?? lead.businessName;
    hero.content.subtitle = extractedCopy.heroSubtitle ?? enriched.inferredDescription ?? hero.content.subtitle;
    hero.content.badge = `${lead.city} ${category.replace("_", " ")}`;
    if (extractedCopy.ctaText) {
      hero.content.primaryCta.label = extractedCopy.ctaText;
    }

    const firstImage = enriched.suggestedImages[0];
    if (firstImage) {
      hero.content.image = firstImage;
    }
  }

  const about = findSection(next, "about");
  if (about) {
    about.content.title = extracted?.keyHeadings.find((heading) => /about|story|mission|team/i.test(heading)) ?? about.content.title;
    about.content.body = extractedCopy.aboutParagraph ?? about.content.body;
    const aboutBullets = extracted?.keyHeadings
      .filter((heading) => heading.length >= 10 && heading.length <= 90)
      .slice(0, 4);
    if (aboutBullets && aboutBullets.length > 0) {
      about.content.bullets = aboutBullets;
    }
  }

  const services = findSection(next, "services");
  if (services && extractedCopy.serviceParagraphs.length) {
    services.content.items = extractedCopy.serviceParagraphs.slice(0, 6).map((description, index) => ({
      title: extracted?.keyHeadings[index + 1] ?? `Service ${index + 1}`,
      description,
      icon: services.content.items[index]?.icon,
    }));
  }

  const contact = findSection(next, "contact");
  if (contact) {
    contact.content.title = `Contact ${lead.businessName}`;
    contact.content.address = lead.address ?? contact.content.address;
    contact.content.phone = lead.phone ?? contact.content.phone;
    contact.content.email = lead.email ?? autoEmail ?? contact.content.email;
    contact.content.hours = lead.openingHours ? [lead.openingHours] : contact.content.hours;
    if (lead.latitude && lead.longitude) {
      contact.content.mapsUrl = `https://www.google.com/maps?q=${lead.latitude},${lead.longitude}`;
    }
  }

  if (extracted?.themeHints.primaryColor || extracted?.themeHints.secondaryColor || extracted?.themeHints.accentColor) {
    next.theme = {
      ...next.theme,
      primaryColor: extracted?.themeHints.primaryColor ?? next.theme.primaryColor,
      secondaryColor: extracted?.themeHints.secondaryColor ?? next.theme.secondaryColor,
      accentColor: extracted?.themeHints.accentColor ?? next.theme.accentColor,
    };
  }

  const gallery = findSection(next, "gallery");
  if (gallery && enriched.suggestedImages.length) {
    gallery.content.items = enriched.suggestedImages.slice(0, 6).map((image, index) => ({
      image,
      alt: `${lead.businessName} image ${index + 1}`
    }));
  }

  const menu = findSection(next, "menu_highlights");
  if (menu && enriched.inferredMenuItems.length) {
    menu.content.items = enriched.inferredMenuItems.slice(0, 6).map((line, index) => ({
      name: `Selection ${index + 1}`,
      description: line,
      priceHint: undefined,
      image: enriched.suggestedImages[index] ?? enriched.suggestedImages[0]
    }));
  }

  return validateDemoSiteContent(next);
}

function summarizeExtractionForPrompt(extracted?: StructuredBusinessExtraction): string {
  if (!extracted) {
    return "No structured extraction available.";
  }

  return JSON.stringify(
    {
      sourceWebsite: extracted.sourceWebsite,
      pages: extracted.pages.map((page) => ({
        url: page.url,
        title: page.title,
        description: page.description,
        headings: page.headings.slice(0, 8),
        paragraphs: page.paragraphs.slice(0, 6),
        ctaPhrases: page.ctaPhrases.slice(0, 6),
      })),
      keyHeadings: extracted.keyHeadings.slice(0, 20),
      aboutText: extracted.aboutText.slice(0, 8),
      serviceDescriptions: extracted.serviceDescriptions.slice(0, 12),
      ctaPhrases: extracted.ctaPhrases.slice(0, 12),
      contact: extracted.contact,
      themeHints: extracted.themeHints,
    },
    null,
    2,
  );
}

function buildPrompt(params: {
  category: BusinessCategory;
  style: DemoSiteStyle;
  siteLabel: string;
  enriched: EnrichedCommerceLead;
}): string {
  const { category, style, siteLabel, enriched } = params;
  const lead = enriched.lead;
  const locale = enriched.locale ?? inferLocaleProfile(lead.country);

  return [
    `Remodel this website content for a real business using verified facts only.`,
    `Target category: ${category}`,
    `Design style: ${style}`,
    `Variant label: ${siteLabel}`,
    `Business name: ${lead.businessName}`,
    `City: ${lead.city}`,
    `Address: ${lead.address ?? "unknown"}`,
    `Phone: ${lead.phone ?? "unknown"}`,
    `Email: ${lead.email ?? "unknown"}`,
    `Website: ${lead.website ?? "unknown"}`,
    `Country: ${lead.country ?? locale.country}`,
    `Target language code: ${locale.language}`,
    `Target language label: ${locale.languageLabel}`,
    `Opening hours: ${lead.openingHours ?? "unknown"}`,
    `Description hints: ${enriched.inferredDescription ?? "none"}`,
    `Menu hints: ${enriched.inferredMenuItems.join(" | ") || "none"}`,
    `Image candidates: ${enriched.suggestedImages.join(" | ") || "none"}`,
    `Structured extraction (primary source, use this first):`,
    summarizeExtractionForPrompt(enriched.extractedWebsite),
    `Requirements:`,
    `- Keep all JSON schema fields valid.`,
    `- Write ALL website copy in ${locale.languageLabel} (${locale.language}).`,
    `- Make copy persuasive and local to the city.`,
    `- Use structured extraction text first before any fallback text.`,
    `- Reuse real headings and service copy when available.`,
    `- Use menu hints when category is restaurant.`,
    `- Use images provided when relevant sections exist.`,
    `- Keep CTA focused on lead conversion.`,
    `- Do not invent hard facts not present above.`
  ].join("\n");
}

export async function generateDemoSiteContentWithAI(params: {
  category: BusinessCategory;
  style: DemoSiteStyle;
  siteLabel: string;
  enriched: EnrichedCommerceLead;
}): Promise<DemoSiteContent> {
  const baseTemplate = getBaseTemplate(params.category);
  const baseContent = applyLeadFacts(baseTemplate, {
    category: params.category,
    style: params.style,
    enriched: params.enriched
  });

  try {
    const instruction = buildPrompt(params);
    const result = await updateDemoSiteJsonWithAI({
      currentContent: baseContent,
      instruction
    });

    return validateDemoSiteContent(result.suggestedContent);
  } catch {
    // Fallback to deterministic remodeling if AI response fails.
    return baseContent;
  }
}
