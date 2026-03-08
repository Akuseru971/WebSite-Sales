import type { BusinessCategory, DemoSiteContent, DemoSiteStyle, DemoSection } from "./types";
import { updateDemoSiteJsonWithAI } from "./ai-edit";
import type { EnrichedCommerceLead } from "@/lib/leads/enrichment";
import type { StructuredBusinessExtraction } from "@/lib/leads/extraction/types";
import { validateDemoSiteContent } from "./validation";
import { inferLocaleProfile } from "@/lib/i18n/locale";
import {
  analyzeSourceWebsiteIdentity,
  applyRedesignPlanToSections,
  createRedesignPlan,
  generateAdaptiveDemoSiteJson,
} from "@/lib/demo-sites/redesign-intelligence";

interface SourcePreservationBundle {
  mustKeepHeadings: string[];
  mustKeepServices: string[];
  mustKeepMenuItems: string[];
  mustKeepImages: string[];
  mustKeepContact: {
    phones: string[];
    emails: string[];
    addresses: string[];
  };
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createSection<TType extends DemoSection["type"]>(
  type: TType,
  order: number,
  content: Extract<DemoSection, { type: TType }>["content"],
): Extract<DemoSection, { type: TType }> {
  return {
    id: `${type}-${order}`,
    type,
    enabled: true,
    order,
    styleVariant: "adaptive",
    content,
  } as Extract<DemoSection, { type: TType }>;
}

function fallbackTheme(style: DemoSiteStyle) {
  switch (style) {
    case "luxury":
      return {
        primaryColor: "#14110f",
        secondaryColor: "#f3ede6",
        accentColor: "#b88a44",
        tone: "luxury" as const,
      };
    case "corporate":
      return {
        primaryColor: "#10233c",
        secondaryColor: "#f4f8fc",
        accentColor: "#1e74d8",
        tone: "corporate" as const,
      };
    case "urban":
      return {
        primaryColor: "#111827",
        secondaryColor: "#f5f7fa",
        accentColor: "#00a6a6",
        tone: "modern" as const,
      };
    case "atmospheric":
    default:
      return {
        primaryColor: "#1f1a17",
        secondaryColor: "#f7f2ea",
        accentColor: "#a86f3f",
        tone: "premium" as const,
      };
  }
}

function createAdaptiveBaseContent(params: {
  category: BusinessCategory;
  style: DemoSiteStyle;
  enriched: EnrichedCommerceLead;
}): DemoSiteContent {
  const { category, style, enriched } = params;
  const lead = enriched.lead;
  const locale = enriched.locale ?? inferLocaleProfile(lead.country);
  const extracted = enriched.extractedWebsite;
  const extractedCopy = getPrimaryCopyFromExtraction(extracted);
  const theme = fallbackTheme(style);

  const sections: DemoSection[] = [];
  let order = 0;

  sections.push(
    createSection("hero", order++, {
      badge: `${lead.city} ${category.replace("_", " ")}`,
      title: extractedCopy.heroTitle ?? lead.businessName,
      subtitle: extractedCopy.heroSubtitle ?? enriched.inferredDescription ?? `${lead.businessName} in ${lead.city}`,
      primaryCta: { label: extractedCopy.ctaText ?? "Contact us", href: "#contact" },
      secondaryCta: { label: "Discover", href: "#about" },
      image: enriched.suggestedImages[0],
    }),
  );

  sections.push(
    createSection("about", order++, {
      title: extracted?.keyHeadings.find((heading) => /about|story|mission|team/i.test(heading)) ?? `About ${lead.businessName}`,
      body: extractedCopy.aboutParagraph ?? enriched.inferredDescription ?? `${lead.businessName} serves ${lead.city}.`,
      bullets: extracted?.keyHeadings.slice(0, 4),
    }),
  );

  const serviceItems = (extractedCopy.serviceParagraphs.length ? extractedCopy.serviceParagraphs : [
    `${lead.businessName} provides tailored services for local clients in ${lead.city}.`,
    `Our team focuses on reliable quality and transparent communication.`,
    `Contact us for a personalized recommendation and pricing details.`,
  ]).slice(0, 6);

  sections.push(
    createSection("services", order++, {
      title: extracted?.keyHeadings.find((heading) => /service|offer|solution|menu/i.test(heading)) ?? "Our services",
      subtitle: "Designed around your goals",
      items: serviceItems.map((description, index) => ({
        title: extracted?.keyHeadings[index + 1] ?? `Service ${index + 1}`,
        description,
      })),
    }),
  );

  if (category === "restaurant" && enriched.inferredMenuItems.length > 0) {
    sections.push(
      createSection("menu_highlights", order++, {
        title: "Menu highlights",
        items: enriched.inferredMenuItems.slice(0, 6).map((line, index) => ({
          name: `Selection ${index + 1}`,
          description: line,
          image: enriched.suggestedImages[index] ?? enriched.suggestedImages[0],
        })),
      }),
    );
  }

  if (category === "hotel" && serviceItems.length > 0) {
    sections.push(
      createSection("room_highlights", order++, {
        title: "Stay highlights",
        items: serviceItems.slice(0, 4).map((description, index) => ({
          name: extracted?.keyHeadings[index + 1] ?? `Suite ${index + 1}`,
          description,
          image: enriched.suggestedImages[index] ?? enriched.suggestedImages[0],
        })),
      }),
    );
  }

  if (category === "real_estate" && serviceItems.length > 0) {
    sections.push(
      createSection("featured_properties", order++, {
        title: "Featured opportunities",
        subtitle: `${lead.city} market insights`,
        items: serviceItems.slice(0, 4).map((description, index) => ({
          title: extracted?.keyHeadings[index + 1] ?? `Property ${index + 1}`,
          location: lead.city,
          priceHint: "Price on request",
          type: "Curated",
          image: enriched.suggestedImages[index] ?? enriched.suggestedImages[0],
        })),
      }),
    );
  }

  if (enriched.suggestedImages.length > 0) {
    sections.push(
      createSection("gallery", order++, {
        title: "Gallery",
        items: enriched.suggestedImages.slice(0, 8).map((image, index) => ({
          image,
          alt: `${lead.businessName} image ${index + 1}`,
        })),
      }),
    );
  }

  if ((extracted?.ctaPhrases.length ?? 0) > 0) {
    sections.push(
      createSection("stats", order++, {
        title: "Why choose us",
        items: extracted!.ctaPhrases.slice(0, 3).map((phrase, index) => ({
          label: `Benefit ${index + 1}`,
          value: phrase,
        })),
      }),
    );
  }

  const testimonials = extracted?.pages
    .flatMap((page) => page.paragraphs)
    .filter((line) => /review|testimonial|client|customer|"/i.test(line))
    .slice(0, 3);

  if (testimonials && testimonials.length > 0) {
    sections.push(
      createSection("testimonials", order++, {
        title: "Client feedback",
        items: testimonials.map((quote, index) => ({
          quote,
          author: `Client ${index + 1}`,
        })),
      }),
    );
  }

  sections.push(
    createSection("cta", order++, {
      title: `Work with ${lead.businessName}`,
      body: `Discuss your project with our team in ${lead.city}.`,
      action: {
        label: extractedCopy.ctaText ?? "Get in touch",
        href: "#contact",
      },
    }),
  );

  sections.push(
    createSection("contact", order++, {
      title: `Contact ${lead.businessName}`,
      address: lead.address,
      phone: lead.phone,
      email: lead.email,
      hours: lead.openingHours ? [lead.openingHours] : undefined,
      mapsUrl: lead.latitude && lead.longitude ? `https://www.google.com/maps?q=${lead.latitude},${lead.longitude}` : undefined,
    }),
  );

  return validateDemoSiteContent({
    businessInfo: {
      name: lead.businessName,
      category,
      city: lead.city,
      country: lead.country ?? locale.country,
      address: lead.address,
      phone: lead.phone,
      email: lead.email,
      tagline: enriched.inferredDescription,
      shortDescription: enriched.inferredDescription,
    },
    theme: {
      primaryColor: extracted?.themeHints.primaryColor ?? theme.primaryColor,
      secondaryColor: extracted?.themeHints.secondaryColor ?? theme.secondaryColor,
      accentColor: extracted?.themeHints.accentColor ?? theme.accentColor,
      backgroundStyle: style,
      headingFont: "Playfair Display",
      bodyFont: "Manrope",
      buttonVariant: "solid",
      borderRadius: "soft",
      tone: theme.tone,
    },
    seo: {
      metaTitle: `${lead.businessName} | ${lead.city}`,
      metaDescription: enriched.inferredDescription ?? `${lead.businessName} in ${lead.city}`,
      ogTitle: `${lead.businessName} - Premium redesign`,
      ogDescription: enriched.inferredDescription ?? `${lead.businessName} in ${lead.city}`,
    },
    contact: {
      contactName: lead.businessName,
      email: lead.email,
      phone: lead.phone,
      bookingEnabled: true,
      formEnabled: true,
      openingHours: lead.openingHours ? [lead.openingHours] : undefined,
    },
    sections,
  });
}

function buildSourcePreservationBundle(enriched: EnrichedCommerceLead): SourcePreservationBundle {
  const extracted = enriched.extractedWebsite;

  return {
    mustKeepHeadings: (extracted?.keyHeadings ?? []).slice(0, 16),
    mustKeepServices: (extracted?.serviceDescriptions ?? []).slice(0, 16),
    mustKeepMenuItems: enriched.inferredMenuItems.slice(0, 20),
    mustKeepImages: enriched.suggestedImages.slice(0, 18),
    mustKeepContact: {
      phones: (extracted?.contact.phones ?? []).slice(0, 6),
      emails: (extracted?.contact.emails ?? []).slice(0, 6),
      addresses: (extracted?.contact.addresses ?? []).slice(0, 4),
    },
  };
}

function summarizeText(text: string, maxChars: number): { compact: string; overflow?: string } {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) {
    return { compact: normalized };
  }

  const slices = normalized.match(/[^.!?]+[.!?]?/g) ?? [normalized];
  let compact = "";
  let index = 0;

  while (index < slices.length && (compact + slices[index]).trim().length <= maxChars) {
    compact = `${compact} ${slices[index]}`.trim();
    index += 1;
  }

  if (!compact) {
    compact = `${normalized.slice(0, maxChars - 3).trimEnd()}...`;
  }

  const overflow = slices.slice(index).join(" ").trim();
  return {
    compact,
    overflow: overflow || undefined,
  };
}

function compressHomepageDensity(content: DemoSiteContent): DemoSiteContent {
  const next = deepClone(content);
  const overflowFaqs: Array<{ question: string; answer: string }> = [];

  next.sections = next.sections.map((section) => {
    if (section.type === "about") {
      const summarized = summarizeText(section.content.body, 420);
      if (summarized.overflow) {
        overflowFaqs.push({ question: "More about our story", answer: summarized.overflow });
      }
      return {
        ...section,
        content: {
          ...section.content,
          body: summarized.compact,
        },
      };
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
            return {
              ...item,
              description: summarized.compact,
            };
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
            return {
              ...item,
              description: summarized.compact,
            };
          }),
        },
      };
    }

    if (section.type === "cta") {
      const summarized = summarizeText(section.content.body, 220);
      if (summarized.overflow) {
        overflowFaqs.push({ question: "Additional booking information", answer: summarized.overflow });
      }
      return {
        ...section,
        content: {
          ...section.content,
          body: summarized.compact,
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
        next.sections[faqIndex] = {
          ...faqSection,
          content: {
            ...faqSection.content,
            items: [...faqSection.content.items, ...overflowFaqs].slice(0, 10),
          },
        };
      }
    } else {
      next.sections.push(
        createSection("faq", next.sections.length, {
          title: "More information",
          items: overflowFaqs.slice(0, 8),
        }),
      );
    }
  }

  next.sections = next.sections
    .sort((a, b) => a.order - b.order)
    .map((section, index) => ({
      ...section,
      order: index,
    }));

  return validateDemoSiteContent(next);
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
  siteProfileSummary: string;
  redesignPlanSummary: string;
  sourcePreservationSummary: string;
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
    `Extracted site profile (identity layer):`,
    params.siteProfileSummary,
    `Redesign plan (agency strategy layer):`,
    params.redesignPlanSummary,
    `Source preservation bundle (keep this material as priority):`,
    params.sourcePreservationSummary,
    `Requirements:`,
    `- Keep all JSON schema fields valid.`,
    `- Write ALL website copy in ${locale.languageLabel} (${locale.language}).`,
    `- Preserve business recognizability and authentic identity cues.`,
    `- Preserve strong source phrasing and media when quality is good.`,
    `- Preserve as much original text, image usage, and menu descriptions as possible.`,
    `- If content is too long for homepage, summarize it and move detailed remainder into deeper sections (FAQ/details), not delete it.`,
    `- Fill missing details only when necessary and keep them generic.`,
    `- Make copy persuasive and local to the city.`,
    `- Use structured extraction text first before any fallback text.`,
    `- Do not flatten output into a category-generic template voice.`,
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
  let baseContent = createAdaptiveBaseContent({
    category: params.category,
    style: params.style,
    enriched: params.enriched,
  });

  baseContent = applyLeadFacts(baseContent, {
    category: params.category,
    style: params.style,
    enriched: params.enriched
  });

  const extractedSiteProfile = analyzeSourceWebsiteIdentity(params.enriched);
  const redesignPlan = await createRedesignPlan(extractedSiteProfile);
  const sourcePreservationBundle = buildSourcePreservationBundle(params.enriched);
  const adaptiveSiteJson = generateAdaptiveDemoSiteJson(redesignPlan, baseContent);

  baseContent = {
    ...baseContent,
    extractedSiteProfile,
    redesignPlan,
    adaptiveSiteJson,
    sections: applyRedesignPlanToSections({
      content: baseContent,
      plan: redesignPlan,
    }),
  };
  baseContent = compressHomepageDensity(baseContent);

  const siteProfileSummary = JSON.stringify(extractedSiteProfile, null, 2);
  const redesignPlanSummary = JSON.stringify(redesignPlan, null, 2);
  const sourcePreservationSummary = JSON.stringify(sourcePreservationBundle, null, 2);

  try {
    const result = await updateDemoSiteJsonWithAI({
      currentContent: baseContent,
      instruction: buildPrompt({
        ...params,
        siteProfileSummary,
        redesignPlanSummary,
        sourcePreservationSummary,
      })
    });

    return compressHomepageDensity(validateDemoSiteContent({
      ...result.suggestedContent,
      extractedSiteProfile,
      redesignPlan,
      adaptiveSiteJson,
    }));
  } catch {
    // Fallback to deterministic remodeling if AI response fails.
    return baseContent;
  }
}
