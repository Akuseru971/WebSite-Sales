import OpenAI from "openai";
import type {
  AdaptiveSiteComposition,
  DemoSection,
  DemoSiteContent,
  ExtractedSiteProfile,
  RedesignPlan,
  SectionType,
  SourceBrandSignals,
  SourceSectionMapItem,
  SourceStructureSummary,
  VisualMood,
} from "@/lib/demo-sites/types";
import type { EnrichedCommerceLead } from "@/lib/leads/enrichment";
import { inferLocaleProfile } from "@/lib/i18n/locale";

function uniqueStrings(values: string[], limit = 20): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
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

function inferVisualMood(signals: SourceBrandSignals, structure: SourceStructureSummary): VisualMood {
  const bag = `${signals.visualTone ?? ""} ${signals.positioning ?? ""} ${structure.architectureType ?? ""}`.toLowerCase();

  if (/luxury|elegant|premium|prestige/.test(bag)) {
    return "immersive";
  }
  if (/corporate|professional|business|reassuring/.test(bag)) {
    return "corporate";
  }
  if (/warm|family|friendly|local|cozy/.test(bag)) {
    return "warm";
  }
  if (/minimal|clean|simple/.test(bag)) {
    return "minimal";
  }
  if (/bold|vibrant|dynamic/.test(bag)) {
    return "bold";
  }

  return "editorial";
}

function mapSectionHintToSectionType(hint: string): SectionType {
  const value = hint.toLowerCase();

  if (/hero|home|welcome/.test(value)) return "hero";
  if (/about|story|mission|team/.test(value)) return "about";
  if (/service|offer|amenit/.test(value)) return "services";
  if (/menu|dish|food/.test(value)) return "menu_highlights";
  if (/room|suite/.test(value)) return "room_highlights";
  if (/property|listing|estate/.test(value)) return "featured_properties";
  if (/gallery|photo|image/.test(value)) return "gallery";
  if (/stats|numbers|kpi/.test(value)) return "stats";
  if (/coverage|area|location/.test(value)) return "service_coverage";
  if (/testimonial|review/.test(value)) return "testimonials";
  if (/faq|question/.test(value)) return "faq";
  if (/cta|book|reserve|contact-us/.test(value)) return "cta";
  if (/contact|address|phone/.test(value)) return "contact";

  return "about";
}

export function extractBrandDNA(enriched: EnrichedCommerceLead): SourceBrandSignals {
  const extracted = enriched.extractedWebsite;
  const lead = enriched.lead;

  const colorSignals = [
    extracted?.themeHints.primaryColor,
    extracted?.themeHints.secondaryColor,
    extracted?.themeHints.accentColor,
  ].filter((color): color is string => Boolean(color));

  const headingBag = extracted?.keyHeadings.join(" ").toLowerCase() ?? "";
  const ctaBag = extracted?.ctaPhrases.join(" ").toLowerCase() ?? "";

  const positioning = /luxury|premium|exclusive/.test(headingBag)
    ? "luxury-premium"
    : /trusted|reliable|professional|agency/.test(headingBag)
      ? "corporate-reassuring"
      : /family|warm|homemade|local/.test(headingBag)
        ? "warm-local"
        : "practical-professional";

  const visualTone = extracted?.pageStructureHints.includes("image-heavy")
    ? "image-led"
    : extracted?.pageStructureHints.includes("rich-headings")
      ? "editorial"
      : "clean";

  return {
    businessName: lead.businessName,
    slogan: enriched.inferredDescription,
    brandColors: colorSignals,
    typographyFeel: /serif|elegant/.test(headingBag) ? "elegant-serif" : "modern-readable",
    visualTone,
    trustStyle: /certified|trusted|years|since/.test(headingBag) ? "proof-driven" : "benefit-driven",
    positioning,
    toneOfVoice: /discover|experience|crafted/.test(headingBag) ? "aspirational" : "direct",
    ctaStyle: /book|reserve|schedule/.test(ctaBag) ? "booking-forward" : "contact-forward",
  };
}

export function buildSectionMap(enriched: EnrichedCommerceLead): SourceSectionMapItem[] {
  const pages = enriched.extractedWebsite?.pages ?? [];
  let order = 0;

  return pages.flatMap((page) => {
    const headingItems = page.headings.slice(0, 8).map((heading) => {
      order += 1;
      return {
        pageUrl: page.url,
        navLabel: heading,
        sectionTypeHint: mapSectionHintToSectionType(heading),
        heading,
        order,
      } satisfies SourceSectionMapItem;
    });

    if (headingItems.length > 0) {
      return headingItems;
    }

    order += 1;
    return [
      {
        pageUrl: page.url,
        sectionTypeHint: mapSectionHintToSectionType(page.title || page.url),
        heading: page.title || undefined,
        order,
      } satisfies SourceSectionMapItem,
    ];
  });
}

export function analyzeSourceWebsiteIdentity(enriched: EnrichedCommerceLead): ExtractedSiteProfile {
  const extracted = enriched.extractedWebsite;
  const lead = enriched.lead;
  const locale = enriched.locale ?? inferLocaleProfile(lead.country);
  const sectionMap = buildSectionMap(enriched);
  const brandSignals = extractBrandDNA(enriched);

  const navItems = uniqueStrings(
    [...(extracted?.navItems ?? []), ...sectionMap.map((item) => item.navLabel ?? "").filter(Boolean)],
    14,
  );
  const homepageSectionOrder = uniqueStrings(sectionMap.map((item) => item.sectionTypeHint), 14);

  const structureSummary: SourceStructureSummary = {
    navItems,
    homepageSectionOrder,
    architectureType: extracted?.pageStructureHints.includes("cta-driven") ? "conversion" : "informational",
    majorSectionCount: sectionMap.length,
    repeatedPatterns: uniqueStrings(extracted?.pageStructureHints ?? [], 10),
  };

  const screenshots = extracted?.screenshots ?? [];

  const trustSignals = uniqueStrings(
    (extracted?.pages ?? [])
      .flatMap((page) => page.paragraphs)
      .filter((paragraph) => /since|years|trusted|licensed|certified|awarded|reviews?/i.test(paragraph)),
    10,
  );

  const faqPairs = uniqueStrings(
    (extracted?.pages ?? [])
      .flatMap((page) => page.paragraphs)
      .filter((paragraph) => /\?$/.test(paragraph) || /^q[:\s]/i.test(paragraph)),
    12,
  ).map((question) => ({ question, answer: "Please contact us for exact details." }));

  const openings = uniqueStrings(
    (extracted?.pages ?? [])
      .flatMap((page) => page.paragraphs)
      .filter((line) => /(mon|tue|wed|thu|fri|sat|sun|hour|open|close)/i.test(line)),
    8,
  );

  return {
    sourceUrl: extracted?.sourceWebsite ?? (lead.website?.startsWith("http") ? lead.website : `https://${lead.website ?? ""}`),
    extractedAt: extracted?.crawledAt ?? new Date().toISOString(),
    businessIdentity: brandSignals,
    contentIdentity: {
      headings: uniqueStrings(extracted?.keyHeadings ?? [], 24),
      aboutText: uniqueStrings(extracted?.aboutText ?? [enriched.inferredDescription ?? ""], 10),
      services: uniqueStrings(extracted?.serviceDescriptions ?? [], 18),
      faqs: faqPairs,
      testimonials: uniqueStrings(
        (extracted?.pages ?? [])
          .flatMap((page) => page.paragraphs)
          .filter((line) => /"|review|testimonial|client|customer/i.test(line)),
        8,
      ),
      trustSignals,
      reservationWording: uniqueStrings(extracted?.ctaPhrases.filter((phrase) => /book|reserve|appointment/i.test(phrase)) ?? [], 8),
      locationWording: uniqueStrings((extracted?.contact.addresses ?? []).concat(lead.city), 8),
      contactDetails: {
        phones: uniqueStrings((extracted?.contact.phones ?? []).concat(lead.phone ?? ""), 8),
        emails: uniqueStrings((extracted?.contact.emails ?? []).concat(lead.email ?? ""), 8),
        addresses: uniqueStrings((extracted?.contact.addresses ?? []).concat(lead.address ?? ""), 8),
        openingHours: openings,
      },
    },
    visualIdentity: {
      logoUrl: extracted?.logo?.url,
      heroImages: uniqueStrings(extracted?.heroImages.map((image) => image.url) ?? [], 8),
      galleryImages: uniqueStrings(extracted?.galleryImages.map((image) => image.url) ?? [], 20),
      imageStyle: extracted?.pageStructureHints.includes("image-heavy") ? "photographic" : "mixed",
      compositionDensity: extracted?.pageStructureHints.includes("image-heavy") ? "dense" : "balanced",
      moodDescriptors: uniqueStrings([brandSignals.visualTone ?? "", ...(extracted?.toneHints ?? []), locale.languageLabel], 8),
      cardStyleHints: uniqueStrings((extracted?.pages ?? []).flatMap((page) => page.headings).filter((value) => /service|offer|plan|package/i.test(value)), 8),
      buttonStyleHints: uniqueStrings(extracted?.ctaPhrases ?? [], 8),
    },
    structuralIdentity: {
      sectionMap,
      structureSummary,
    },
    redesignOpportunities: [
      "Elevate typographic hierarchy and spacing rhythm for premium readability.",
      "Clarify CTA strategy and align conversion touchpoints with user intent.",
      "Refine section transitions and reduce repetitive blocks for a bespoke flow.",
      "Use authentic imagery with stronger framing and visual storytelling.",
    ],
    sourceScreenshots: screenshots,
  };
}

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

function fallbackRedesignPlan(profile: ExtractedSiteProfile): RedesignPlan {
  const mood = inferVisualMood(profile.businessIdentity, profile.structuralIdentity.structureSummary);
  const suggestedSectionOrder = uniqueStrings(
    ["hero", ...profile.structuralIdentity.structureSummary.homepageSectionOrder, "cta", "contact"],
    10,
  )
    .map((item) => mapSectionHintToSectionType(item))
    .filter((item, index, array) => array.indexOf(item) === index);

  return {
    brandPositioning: profile.businessIdentity.positioning ?? "premium-local",
    visualMood: mood,
    toneOfVoice: profile.businessIdentity.toneOfVoice ?? "professional",
    originalStructureSummary: `${profile.structuralIdentity.structureSummary.majorSectionCount} key blocks with ${profile.structuralIdentity.structureSummary.architectureType ?? "informational"} orientation`,
    preserveElements: uniqueStrings([
      profile.businessIdentity.businessName ?? "business name",
      ...(profile.contentIdentity.headings.slice(0, 4)),
      ...(profile.visualIdentity.heroImages.slice(0, 2)),
    ], 8),
    improveElements: [
      "headline hierarchy",
      "section spacing",
      "visual contrast",
      "CTA clarity",
      "mobile rhythm",
    ],
    mergeElements: ["duplicate service blurbs", "scattered trust signals"],
    simplifyElements: ["overlong paragraphs", "competing CTA variants"],
    elevateElements: ["hero storytelling", "testimonial credibility", "gallery composition"],
    suggestedSectionOrder: suggestedSectionOrder.length ? suggestedSectionOrder : ["hero", "about", "services", "gallery", "testimonials", "cta", "contact"],
    layoutDirection: mood === "immersive" ? "image-led editorial flow" : "conversion-led premium grid",
    imageStrategy: profile.visualIdentity.heroImages.length > 0 ? "reuse authentic hero imagery with cinematic cropping" : "use premium placeholders only where source media is missing",
    typographyDirection: profile.businessIdentity.typographyFeel ?? "high-contrast heading + clean body",
    ctaStyle: profile.businessIdentity.ctaStyle ?? "clear and benefit-focused",
    premiumUpgradeNotes: profile.redesignOpportunities,
  };
}

export async function createRedesignPlan(profile: ExtractedSiteProfile): Promise<RedesignPlan> {
  const openai = getOpenAIClient();
  if (!openai) {
    return fallbackRedesignPlan(profile);
  }

  try {
    const response = await openai.responses.create({
      model: "gpt-5.1-mini",
      input: [
        {
          role: "system",
          content: [{
            type: "input_text",
            text: "You are a premium web redesign strategist. Return JSON only. Preserve recognizability, preserve source identity, avoid template flattening, and propose a bespoke premium redesign plan.",
          }],
        },
        {
          role: "user",
          content: [{
            type: "input_text",
            text: `Create a redesign plan JSON using this extracted profile:\n${JSON.stringify(profile, null, 2)}\n\nRequired keys: brandPositioning, visualMood, toneOfVoice, originalStructureSummary, preserveElements, improveElements, mergeElements, simplifyElements, elevateElements, suggestedSectionOrder, layoutDirection, imageStrategy, typographyDirection, ctaStyle, premiumUpgradeNotes`,
          }],
        },
      ],
      text: { format: { type: "json_object" } },
    });

    const output = response.output_text?.trim();
    if (!output) {
      return fallbackRedesignPlan(profile);
    }

    const parsed = JSON.parse(output) as Partial<RedesignPlan>;
    const fallback = fallbackRedesignPlan(profile);

    return {
      ...fallback,
      ...parsed,
      suggestedSectionOrder: Array.isArray(parsed.suggestedSectionOrder)
        ? parsed.suggestedSectionOrder.map((value) => mapSectionHintToSectionType(String(value)))
        : fallback.suggestedSectionOrder,
      preserveElements: parsed.preserveElements?.length ? parsed.preserveElements : fallback.preserveElements,
      improveElements: parsed.improveElements?.length ? parsed.improveElements : fallback.improveElements,
      premiumUpgradeNotes: parsed.premiumUpgradeNotes?.length ? parsed.premiumUpgradeNotes : fallback.premiumUpgradeNotes,
      visualMood: (parsed.visualMood as VisualMood) ?? fallback.visualMood,
    };
  } catch {
    return fallbackRedesignPlan(profile);
  }
}

export function generateAdaptiveDemoSiteJson(plan: RedesignPlan, baseContent: DemoSiteContent): AdaptiveSiteComposition {
  const mood = plan.visualMood;

  return {
    heroVariant: mood === "immersive" || mood === "bold" ? "immersive" : mood === "minimal" ? "centered" : "split",
    sectionPresentation: mood === "corporate" ? "corporate" : mood === "minimal" ? "minimal" : mood === "immersive" ? "immersive" : "editorial",
    spacingRhythm: mood === "minimal" ? "airy" : mood === "corporate" ? "balanced" : "dense",
    imageProminence: baseContent.sections.some((section) => section.type === "gallery") ? "high" : "medium",
    typographyScale: mood === "bold" ? "display" : mood === "corporate" ? "compact" : "balanced",
    navStyle: mood === "corporate" ? "solid" : mood === "minimal" ? "minimal" : "glass",
    animationStyle: mood === "immersive" ? "cinematic" : "staggered",
  };
}

export function applyRedesignPlanToSections(input: {
  content: DemoSiteContent;
  plan: RedesignPlan;
}): DemoSection[] {
  const byType = new Map(input.content.sections.map((section) => [section.type, section]));
  const ordered: DemoSection[] = [];

  input.plan.suggestedSectionOrder.forEach((sectionType, index) => {
    const candidate = byType.get(sectionType);
    if (!candidate || !candidate.enabled) {
      return;
    }

    ordered.push({
      ...candidate,
      order: index,
      styleVariant: input.plan.visualMood,
    });
  });

  if (ordered.length === 0) {
    return input.content.sections;
  }

  return ordered;
}
