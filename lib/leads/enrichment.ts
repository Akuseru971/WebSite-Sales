import type { CommerceLead } from "./types";
import type { LocaleProfile } from "@/lib/i18n/locale";
import { inferLocaleProfile } from "@/lib/i18n/locale";
import { extractStructuredBusinessContent } from "@/lib/leads/extraction/playwright-extractor";
import type { StructuredBusinessExtraction } from "@/lib/leads/extraction/types";
import { extractStructuredBusinessContentWithFetchFallback } from "@/lib/leads/extraction/fetch-fallback-extractor";

export interface EnrichedCommerceLead {
  lead: CommerceLead;
  locale: LocaleProfile;
  extractedWebsite?: StructuredBusinessExtraction;
  inferredDescription?: string;
  inferredMenuItems: string[];
  suggestedImages: string[];
}

function fallbackDescription(lead: CommerceLead, locale: LocaleProfile): string {
  switch (locale.language) {
    case "fr":
      return `${lead.businessName} est un commerce ${lead.category.replace("_", " ")} situe a ${lead.city}.`;
    case "es":
      return `${lead.businessName} es un negocio de ${lead.category.replace("_", " ")} en ${lead.city}.`;
    case "de":
      return `${lead.businessName} ist ein ${lead.category.replace("_", " ")}-Unternehmen in ${lead.city}.`;
    case "it":
      return `${lead.businessName} e un'attivita ${lead.category.replace("_", " ")} a ${lead.city}.`;
    case "pt":
      return `${lead.businessName} e um negocio de ${lead.category.replace("_", " ")} em ${lead.city}.`;
    case "nl":
      return `${lead.businessName} is een ${lead.category.replace("_", " ")}-bedrijf in ${lead.city}.`;
    case "en":
    default:
      return `${lead.businessName} is a ${lead.category.replace("_", " ")} business in ${lead.city}.`;
  }
}

function extractMenuHintsFromStructuredData(extractedWebsite?: StructuredBusinessExtraction): string[] {
  if (!extractedWebsite) {
    return [];
  }

  const menuSignals = [
    ...extractedWebsite.serviceDescriptions,
    ...extractedWebsite.pages
      .filter((page) => /menu|services?|products?|offers?/i.test(`${page.url} ${page.title}`))
      .flatMap((page) => page.paragraphs),
  ];

  const candidates = menuSignals.filter((line) => {
    const hasPrice = /(?:\d+[.,]\d{2}\s?(?:€|eur|usd|\$)|(?:€|\$)\s?\d+)/i.test(line);
    const hasMenuWord = /(menu|plat|dish|starter|dessert|pizza|burger|pasta|cocktail|wine|vin|service|package)/i.test(line);
    return hasPrice || hasMenuWord;
  });

  return Array.from(new Set(candidates.map((line) => line.trim()))).slice(0, 12);
}

function uniqueStrings(values: string[], limit = 50): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(normalized);

    if (output.length >= limit) {
      break;
    }
  }

  return output;
}

function mergeExtractions(
  primary: StructuredBusinessExtraction | null,
  fallback: StructuredBusinessExtraction | null,
): StructuredBusinessExtraction | null {
  if (!primary && !fallback) {
    return null;
  }

  if (!primary) {
    return fallback;
  }

  if (!fallback) {
    return primary;
  }

  const pages = [...primary.pages, ...fallback.pages].filter((page, index, array) =>
    array.findIndex((candidate) => candidate.url === page.url) === index,
  );

  const keyHeadings = uniqueStrings([...primary.keyHeadings, ...fallback.keyHeadings], 50);
  const aboutText = uniqueStrings([...primary.aboutText, ...fallback.aboutText], 24);
  const serviceDescriptions = uniqueStrings([...primary.serviceDescriptions, ...fallback.serviceDescriptions], 30);
  const ctaPhrases = uniqueStrings([...primary.ctaPhrases, ...fallback.ctaPhrases], 24);

  const heroImages = uniqueStrings(
    [...primary.heroImages.map((item) => item.url), ...fallback.heroImages.map((item) => item.url)],
    14,
  ).map((url) => primary.heroImages.find((item) => item.url === url) ?? fallback.heroImages.find((item) => item.url === url)!).filter(Boolean);

  const galleryImages = uniqueStrings(
    [...primary.galleryImages.map((item) => item.url), ...fallback.galleryImages.map((item) => item.url)],
    24,
  ).map((url) => primary.galleryImages.find((item) => item.url === url) ?? fallback.galleryImages.find((item) => item.url === url)!).filter(Boolean);

  return {
    ...primary,
    pages,
    keyHeadings,
    aboutText,
    serviceDescriptions,
    ctaPhrases,
    logo: primary.logo ?? fallback.logo,
    heroImages,
    galleryImages,
    contact: {
      phones: uniqueStrings([...primary.contact.phones, ...fallback.contact.phones], 10),
      emails: uniqueStrings([...primary.contact.emails, ...fallback.contact.emails], 10),
      addresses: uniqueStrings([...primary.contact.addresses, ...fallback.contact.addresses], 8),
    },
    themeHints: {
      primaryColor: primary.themeHints.primaryColor ?? fallback.themeHints.primaryColor,
      secondaryColor: primary.themeHints.secondaryColor ?? fallback.themeHints.secondaryColor,
      accentColor: primary.themeHints.accentColor ?? fallback.themeHints.accentColor,
    },
    pageStructureHints: uniqueStrings([...primary.pageStructureHints, ...fallback.pageStructureHints], 14),
    screenshots: [...primary.screenshots, ...fallback.screenshots].slice(0, 4),
    navItems: uniqueStrings([...primary.navItems, ...fallback.navItems], 16),
    toneHints: uniqueStrings([...primary.toneHints, ...fallback.toneHints], 10),
  };
}

function isExtractionSufficient(extracted: StructuredBusinessExtraction | null): boolean {
  if (!extracted) {
    return false;
  }

  const contentCount = extracted.keyHeadings.length + extracted.aboutText.length + extracted.serviceDescriptions.length;
  const mediaCount = extracted.heroImages.length + extracted.galleryImages.length;

  return contentCount >= 6 || mediaCount >= 4;
}

export async function enrichCommerceLead(lead: CommerceLead): Promise<EnrichedCommerceLead> {
  const locale = inferLocaleProfile(lead.country);
  let extractedWebsitePrimary: StructuredBusinessExtraction | null = null;
  let extractedWebsiteFallback: StructuredBusinessExtraction | null = null;
  if (lead.website) {
    try {
      extractedWebsitePrimary = await extractStructuredBusinessContent(lead.website);
    } catch {
      extractedWebsitePrimary = null;
    }

    if (!isExtractionSufficient(extractedWebsitePrimary)) {
      extractedWebsiteFallback = await extractStructuredBusinessContentWithFetchFallback(lead.website);
    }
  }

  const extractedWebsite = mergeExtractions(extractedWebsitePrimary, extractedWebsiteFallback);

  const extractedDescription =
    extractedWebsite?.aboutText[0] ??
    extractedWebsite?.pages.find((page) => page.description)?.description ??
    extractedWebsite?.keyHeadings[0];

  const extractedImages = extractedWebsite
    ? [
        ...(extractedWebsite.logo ? [extractedWebsite.logo.url] : []),
        ...extractedWebsite.heroImages.map((image) => image.url),
        ...extractedWebsite.galleryImages.map((image) => image.url),
      ]
    : [];

  const inferredAddress = lead.address ?? extractedWebsite?.contact.addresses[0];
  const inferredPhone = lead.phone ?? extractedWebsite?.contact.phones[0];
  const inferredEmail = lead.email ?? extractedWebsite?.contact.emails[0];

  const inferredDescription =
    lead.description ??
    extractedDescription ??
    fallbackDescription(lead, locale);

  return {
    lead: {
      ...lead,
      address: inferredAddress,
      phone: inferredPhone,
      email: inferredEmail,
      country: lead.country ?? locale.country,
      source: extractedWebsite ? "hybrid" : lead.source,
    },
    locale,
    extractedWebsite: extractedWebsite ?? undefined,
    inferredDescription,
    inferredMenuItems: extractMenuHintsFromStructuredData(extractedWebsite ?? undefined),
    suggestedImages: Array.from(new Set(extractedImages)).slice(0, 12),
  };
}
