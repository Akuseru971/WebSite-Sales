import type { CommerceLead } from "./types";
import type { LocaleProfile } from "@/lib/i18n/locale";
import { inferLocaleProfile } from "@/lib/i18n/locale";
import { extractStructuredBusinessContent } from "@/lib/leads/extraction/playwright-extractor";
import type { StructuredBusinessExtraction } from "@/lib/leads/extraction/types";

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

export async function enrichCommerceLead(lead: CommerceLead): Promise<EnrichedCommerceLead> {
  const locale = inferLocaleProfile(lead.country);
  let extractedWebsite: StructuredBusinessExtraction | null = null;
  if (lead.website) {
    try {
      extractedWebsite = await extractStructuredBusinessContent(lead.website);
    } catch {
      extractedWebsite = null;
    }
  }

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
