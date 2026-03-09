import type {
  BusinessCategory,
  DemoSection,
  DemoSiteContent,
  DemoSiteStyle,
  ExtractedSiteProfile,
  RedesignPlan,
  SectionType,
} from "./types";
import type { EnrichedCommerceLead } from "@/lib/leads/enrichment";
import { validateDemoSiteContent } from "./validation";
import { inferLocaleProfile } from "@/lib/i18n/locale";
import {
  analyzeSourceWebsiteIdentity,
  createRedesignPlan,
  generateAdaptiveDemoSiteJson,
} from "@/lib/demo-sites/redesign-intelligence";
import {
  applyPremiumVisualLayer,
  buildRedesignPromptFromSource,
  buildSourceStructureJson,
  crawlWebsitePages,
  extractSourceAssets,
  extractSourceBrandSignals,
  extractStructuredSourceContent,
  generateRedesignedHtmlFromSource,
  reconstructSourceWebsiteHtml,
} from "@/lib/demo-sites/source-redesign-pipeline";
import { generateRestaurantDemoSiteContent } from "@/lib/demo-sites/restaurant-generation";

function uniqueStrings(values: string[], limit = 20): string[] {
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

function asText(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    const normalized = value.replace(/\s+/g, " ").trim();
    return normalized || fallback;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

function createSection<TType extends DemoSection["type"]>(
  type: TType,
  order: number,
  styleVariant: string,
  content: Extract<DemoSection, { type: TType }>["content"],
): Extract<DemoSection, { type: TType }> {
  return {
    id: `${type}-${order}`,
    type,
    enabled: true,
    order,
    styleVariant,
    content,
  } as Extract<DemoSection, { type: TType }>;
}

function summarizeText(text: string, maxChars: number): { compact: string; overflow?: string } {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) {
    return { compact: normalized };
  }

  const parts = normalized.match(/[^.!?]+[.!?]?/g) ?? [normalized];
  let compact = "";
  let index = 0;

  while (index < parts.length && (compact + parts[index]).trim().length <= maxChars) {
    compact = `${compact} ${parts[index]}`.trim();
    index += 1;
  }

  if (!compact) {
    compact = `${normalized.slice(0, maxChars - 3).trimEnd()}...`;
  }

  const overflow = parts.slice(index).join(" ").trim();
  return { compact, overflow: overflow || undefined };
}

function getSourceDrivenTheme(params: {
  style: DemoSiteStyle;
  profile: ExtractedSiteProfile;
}): DemoSiteContent["theme"] {
  const mood = params.profile.businessIdentity.visualTone?.toLowerCase() ?? "";

  const fallbackByStyle: Record<DemoSiteStyle, { primary: string; secondary: string; accent: string; tone: DemoSiteContent["theme"]["tone"] }> = {
    luxury: { primary: "#16120f", secondary: "#f4ede5", accent: "#b78640", tone: "luxury" },
    corporate: { primary: "#0e223c", secondary: "#f4f7fb", accent: "#2374d5", tone: "corporate" },
    urban: { primary: "#111827", secondary: "#f6f8fb", accent: "#00a8a8", tone: "modern" },
    atmospheric: { primary: "#1d1714", secondary: "#f7f2ea", accent: "#a86f3f", tone: "premium" },
  };

  const fallback = fallbackByStyle[params.style];
  const sourceColors = params.profile.businessIdentity.brandColors ?? [];

  return {
    primaryColor: sourceColors[0] ?? fallback.primary,
    secondaryColor: sourceColors[1] ?? fallback.secondary,
    accentColor: sourceColors[2] ?? fallback.accent,
    backgroundStyle: params.style,
    headingFont: mood.includes("corporate") ? "DM Serif Display" : "Playfair Display",
    bodyFont: "Manrope",
    buttonVariant: "solid",
    borderRadius: mood.includes("corporate") ? "rounded" : "soft",
    tone: fallback.tone,
  };
}

function getSectionTypeCandidates(profile: ExtractedSiteProfile, plan: RedesignPlan): SectionType[] {
  const fromPlan = plan.suggestedSectionOrder;
  const fromMap = profile.structuralIdentity.sectionMap
    .map((item) => String(item.sectionTypeHint))
    .filter(Boolean) as SectionType[];

  const merged = uniqueStrings([
    ...fromPlan,
    ...fromMap,
    "hero",
    "about",
    "services",
    "cta",
    "contact",
  ], 16) as SectionType[];

  return merged;
}

function buildSectionsFromSource(params: {
  enriched: EnrichedCommerceLead;
  profile: ExtractedSiteProfile;
  plan: RedesignPlan;
}): DemoSection[] {
  const { enriched, profile, plan } = params;
  const lead = enriched.lead;
  const styleVariant = plan.visualMood;

  const headings = profile.contentIdentity.headings;
  const aboutBlocks = profile.contentIdentity.aboutText;
  const services = profile.contentIdentity.services;
  const menuItems = enriched.inferredMenuItems;
  const images = profile.visualIdentity.galleryImages.length
    ? profile.visualIdentity.galleryImages
    : enriched.suggestedImages;

  const contactAddress = profile.contentIdentity.contactDetails.addresses[0] ?? lead.address;
  const contactPhone = profile.contentIdentity.contactDetails.phones[0] ?? lead.phone;
  const contactEmail = profile.contentIdentity.contactDetails.emails[0] ?? lead.email;
  const openingHours = profile.contentIdentity.contactDetails.openingHours.length
    ? profile.contentIdentity.contactDetails.openingHours
    : lead.openingHours
      ? [lead.openingHours]
      : undefined;

  const serviceItems = (services.length ? services : [enriched.inferredDescription ?? `${lead.businessName} serves ${lead.city}.`])
    .slice(0, 8)
    .map((description, index) => ({
      title: headings[index + 1] ?? `Service ${index + 1}`,
      description: asText(description, `${lead.businessName} service in ${lead.city}.`),
    }));

  const sectionFactory: Partial<Record<SectionType, () => DemoSection>> = {
    hero: () =>
      createSection("hero", 0, styleVariant, {
        badge: headings[0] ?? `${lead.city}`,
        title: headings[0] ?? lead.businessName,
        subtitle: aboutBlocks[0] ?? enriched.inferredDescription ?? `${lead.businessName} in ${lead.city}`,
        primaryCta: {
          label: profile.contentIdentity.reservationWording[0] ?? "Get in touch",
          href: "#contact",
        },
        secondaryCta: {
          label: "Discover",
          href: "#about",
        },
        image: profile.visualIdentity.heroImages[0] ?? images[0],
      }),
    about: () =>
      createSection("about", 0, styleVariant, {
        title: asText(
          headings.find((heading) => /about|story|mission|team/i.test(heading)),
          `About ${lead.businessName}`,
        ),
        body: asText(
          aboutBlocks[0] ?? enriched.inferredDescription,
          `${lead.businessName} serves ${lead.city}.`,
        ),
        bullets: headings.slice(1, 5),
      }),
    services: () =>
      createSection("services", 0, styleVariant, {
        title: headings.find((heading) => /service|offer|solution|menu/i.test(heading)) ?? "What we offer",
        subtitle: "Built around real client needs",
        items: serviceItems.slice(0, 6),
      }),
    menu_highlights: () =>
      createSection("menu_highlights", 0, styleVariant, {
        title: "Signature selections",
        items: (menuItems.length ? menuItems : services)
          .slice(0, 8)
          .map((description, index) => ({
            name: headings[index + 1] ?? `Selection ${index + 1}`,
            description,
            image: images[index] ?? images[0],
          })),
      }),
    gallery: () =>
      createSection("gallery", 0, styleVariant, {
        title: "Visual highlights",
        items: images.slice(0, 10).map((image, index) => ({
          image,
          alt: `${lead.businessName} image ${index + 1}`,
        })),
      }),
    testimonials: () =>
      createSection("testimonials", 0, styleVariant, {
        title: "What clients say",
        items: (profile.contentIdentity.testimonials.length
          ? profile.contentIdentity.testimonials
          : profile.contentIdentity.trustSignals)
          .slice(0, 4)
          .map((quote, index) => ({
            quote,
            author: `Client ${index + 1}`,
          })),
      }),
    faq: () =>
      createSection("faq", 0, styleVariant, {
        title: "Frequently asked questions",
        items: profile.contentIdentity.faqs.length
          ? profile.contentIdentity.faqs.slice(0, 8)
          : [
              {
                question: `How can I contact ${lead.businessName}?`,
                answer: `Use the contact section to reach ${lead.businessName}.`,
              },
            ],
      }),
    cta: () =>
      createSection("cta", 0, styleVariant, {
        title: `Ready to work with ${lead.businessName}?`,
        body: asText(plan.layoutDirection, "A premium redesign aligned with your source website identity."),
        action: {
          label: profile.contentIdentity.reservationWording[0] ?? "Contact us",
          href: "#contact",
        },
      }),
    contact: () =>
      createSection("contact", 0, styleVariant, {
        title: `Contact ${lead.businessName}`,
        address: contactAddress,
        phone: contactPhone,
        email: contactEmail,
        hours: openingHours,
        mapsUrl: lead.latitude && lead.longitude ? `https://www.google.com/maps?q=${lead.latitude},${lead.longitude}` : undefined,
      }),
    stats: () =>
      createSection("stats", 0, styleVariant, {
        title: "Trust highlights",
        items: (profile.contentIdentity.trustSignals.length ? profile.contentIdentity.trustSignals : plan.preserveElements)
          .slice(0, 3)
          .map((value, index) => ({
            label: `Proof ${index + 1}`,
            value,
          })),
      }),
    featured_properties: () =>
      createSection("featured_properties", 0, styleVariant, {
        title: "Featured listings",
        subtitle: `${lead.city} opportunities`,
        items: serviceItems.slice(0, 4).map((item, index) => ({
          title: item.title,
          location: lead.city,
          priceHint: "Price on request",
          type: "Curated",
          image: images[index] ?? images[0],
        })),
      }),
    room_highlights: () =>
      createSection("room_highlights", 0, styleVariant, {
        title: "Stay highlights",
        items: serviceItems.slice(0, 4).map((item, index) => ({
          name: item.title,
          description: item.description,
          image: images[index] ?? images[0],
        })),
      }),
    service_coverage: () =>
      createSection("service_coverage", 0, styleVariant, {
        title: "Service area",
        areas: uniqueStrings([lead.city, ...profile.contentIdentity.locationWording], 8),
        note: "Contact us for tailored coverage details.",
      }),
    coverage: () =>
      createSection("coverage", 0, styleVariant, {
        title: "Service area",
        areas: uniqueStrings([lead.city, ...profile.contentIdentity.locationWording], 8),
        note: "Contact us for tailored coverage details.",
      }),
  };

  const desiredTypes = getSectionTypeCandidates(profile, plan);
  const built: DemoSection[] = [];

  desiredTypes.forEach((type) => {
    const builder = sectionFactory[type];
    if (!builder) {
      return;
    }

    const section = builder();
    if (!section) {
      return;
    }

    // Skip empty media-heavy blocks.
    if (section.type === "gallery" && section.content.items.length === 0) {
      return;
    }

    built.push({
      ...section,
      order: built.length,
      id: `${section.type}-${built.length}`,
    });
  });

  const mustHave: SectionType[] = ["hero", "about", "services", "cta", "contact"];
  mustHave.forEach((type) => {
    if (built.some((section) => section.type === type)) {
      return;
    }

    const builder = sectionFactory[type];
    if (!builder) {
      return;
    }

    const section = builder();
    built.push({
      ...section,
      order: built.length,
      id: `${section.type}-${built.length}`,
    });
  });

  return built.sort((a, b) => a.order - b.order);
}

function compressHomepageDensity(content: DemoSiteContent): DemoSiteContent {
  const next = JSON.parse(JSON.stringify(content)) as DemoSiteContent;
  const overflowFaqs: Array<{ question: string; answer: string }> = [];

  next.sections = next.sections.map((section) => {
    if (section.type === "about") {
      const summarized = summarizeText(section.content.body, 420);
      if (summarized.overflow) {
        overflowFaqs.push({ question: "More about our story", answer: summarized.overflow });
      }
      return { ...section, content: { ...section.content, body: summarized.compact } };
    }

    if (section.type === "services") {
      return {
        ...section,
        content: {
          ...section.content,
          items: section.content.items.slice(0, 6).map((item) => {
            const summarized = summarizeText(item.description, 220);
            if (summarized.overflow) {
              overflowFaqs.push({ question: `More details about ${item.title}`, answer: summarized.overflow });
            }
            return { ...item, description: summarized.compact };
          }),
        },
      };
    }

    if (section.type === "menu_highlights") {
      return {
        ...section,
        content: {
          ...section.content,
          items: section.content.items.slice(0, 8).map((item) => {
            const summarized = summarizeText(item.description, 170);
            if (summarized.overflow) {
              overflowFaqs.push({ question: `Details for ${item.name}`, answer: summarized.overflow });
            }
            return { ...item, description: summarized.compact };
          }),
        },
      };
    }

    return section;
  });

  if (overflowFaqs.length > 0) {
    const faqIndex = next.sections.findIndex((section) => section.type === "faq");
    if (faqIndex >= 0) {
      const faqSection = next.sections[faqIndex];
      if (faqSection.type === "faq") {
        faqSection.content.items = [...faqSection.content.items, ...overflowFaqs].slice(0, 10);
      }
    } else {
      next.sections.push(
        createSection("faq", next.sections.length, "adaptive", {
          title: "More information",
          items: overflowFaqs.slice(0, 8),
        }),
      );
    }
  }

  next.sections = next.sections
    .sort((a, b) => a.order - b.order)
    .map((section, index) => ({ ...section, order: index }));

  return validateDemoSiteContent(next);
}

export async function generateDemoSiteContentWithAI(params: {
  category: BusinessCategory;
  style: DemoSiteStyle;
  siteLabel: string;
  enriched: EnrichedCommerceLead;
}): Promise<DemoSiteContent> {
  if (params.category === "restaurant") {
    return generateRestaurantDemoSiteContent({
      enriched: params.enriched,
    });
  }

  if (
    params.enriched.lead.website &&
    (!params.enriched.extractedWebsite ||
      (params.enriched.extractedWebsite.keyHeadings.length === 0 &&
        params.enriched.extractedWebsite.aboutText.length === 0 &&
        params.enriched.extractedWebsite.serviceDescriptions.length === 0 &&
        params.enriched.suggestedImages.length === 0))
  ) {
    throw new Error(
      "Impossible d'extraire suffisamment de contenu depuis le site source. Verifie que le site est accessible publiquement.",
    );
  }

  const lead = params.enriched.lead;
  const locale = params.enriched.locale ?? inferLocaleProfile(lead.country);
  const hasRealSourceWebsite = Boolean(
    lead.website && params.enriched.extractedWebsite?.pages && params.enriched.extractedWebsite.pages.length > 0,
  );

  const extractedSiteProfile = analyzeSourceWebsiteIdentity(params.enriched);
  const redesignPlan = await createRedesignPlan(extractedSiteProfile);
  const sourcePages = hasRealSourceWebsite ? crawlWebsitePages(params.enriched) : undefined;
  const sourceReconstructedHtml = sourcePages ? reconstructSourceWebsiteHtml({ pages: sourcePages }) : undefined;
  const sourceStructureJson = sourcePages ? buildSourceStructureJson({ pages: sourcePages }) : undefined;
  const sourceContentJson = sourcePages
    ? extractStructuredSourceContent({
        enriched: params.enriched,
        pages: sourcePages,
      })
    : undefined;
  const sourceAssetsJson = hasRealSourceWebsite ? extractSourceAssets(params.enriched) : undefined;
  const sourceBrandSignals = hasRealSourceWebsite ? extractSourceBrandSignals(params.enriched) : undefined;

  const sections = buildSectionsFromSource({
    enriched: params.enriched,
    profile: extractedSiteProfile,
    plan: redesignPlan,
  });

  let baseContent = validateDemoSiteContent({
    businessInfo: {
      name: lead.businessName,
      category: params.category,
      city: lead.city,
      country: lead.country ?? locale.country,
      address: lead.address,
      phone: lead.phone,
      email: lead.email,
      tagline: extractedSiteProfile.contentIdentity.aboutText[0] ?? params.enriched.inferredDescription,
      shortDescription: extractedSiteProfile.contentIdentity.aboutText[0] ?? params.enriched.inferredDescription,
    },
    theme: getSourceDrivenTheme({
      style: params.style,
      profile: extractedSiteProfile,
    }),
    seo: {
      metaTitle: `${lead.businessName} | ${lead.city}`,
      metaDescription: extractedSiteProfile.contentIdentity.aboutText[0] ?? params.enriched.inferredDescription ?? `${lead.businessName} in ${lead.city}`,
      ogTitle: `${lead.businessName} - redesigned`,
      ogDescription: extractedSiteProfile.contentIdentity.aboutText[0] ?? params.enriched.inferredDescription ?? `${lead.businessName} in ${lead.city}`,
    },
    contact: {
      contactName: lead.businessName,
      email: extractedSiteProfile.contentIdentity.contactDetails.emails[0] ?? lead.email,
      phone: extractedSiteProfile.contentIdentity.contactDetails.phones[0] ?? lead.phone,
      bookingEnabled: true,
      formEnabled: true,
      openingHours: extractedSiteProfile.contentIdentity.contactDetails.openingHours.length
        ? extractedSiteProfile.contentIdentity.contactDetails.openingHours
        : lead.openingHours
          ? [lead.openingHours]
          : undefined,
    },
    sections,
  });

  const adaptiveSiteJson = generateAdaptiveDemoSiteJson(redesignPlan, baseContent);

  baseContent = compressHomepageDensity({
    ...baseContent,
    extractedSiteProfile,
    sourceReconstructedHtml,
    sourceStructureJson,
    sourceContentJson,
    sourceAssetsJson,
    redesignPlan,
    adaptiveSiteJson,
  });

  if (!hasRealSourceWebsite) {
    return baseContent;
  }

  if (!sourceReconstructedHtml || !sourceStructureJson || !sourceContentJson || !sourceAssetsJson || !sourceBrandSignals) {
    throw new Error("Source website reconstruction is incomplete.");
  }

  const sourcePrompt = buildRedesignPromptFromSource({
    sourceReconstructedHtml,
    sourceStructureJson,
    sourceContentJson,
    sourceAssetsJson,
    sourceBrandSignals,
    redesignPlan,
    category: params.category,
    style: params.style,
    languageLabel: locale.languageLabel,
    languageCode: locale.language,
  });

  try {
    const generatedHtmlPreview = await generateRedesignedHtmlFromSource({
      redesignPrompt: sourcePrompt,
      businessName: lead.businessName,
      languageLabel: locale.languageLabel,
    });

    const premiumContent = applyPremiumVisualLayer({
      content: baseContent,
      redesignPlan,
    });

    return compressHomepageDensity(validateDemoSiteContent({
      ...premiumContent,
      extractedSiteProfile,
      sourceReconstructedHtml,
      sourceStructureJson,
      sourceContentJson,
      sourceAssetsJson,
      generatedHtmlPreview,
      redesignPlan,
      adaptiveSiteJson: premiumContent.adaptiveSiteJson ?? adaptiveSiteJson,
    }));
  } catch (error) {
    throw new Error(
      `Source-aware HTML generation failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}
