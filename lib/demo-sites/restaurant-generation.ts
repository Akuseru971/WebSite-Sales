import type { DemoSiteContent, RestaurantContent, RestaurantDiagnostics, RestaurantLocaleCode } from "@/lib/demo-sites/types";
import type { EnrichedCommerceLead } from "@/lib/leads/enrichment";
import { crawlRestaurantWebsite, type RestaurantCrawlResult, type RestaurantRawImage, type RestaurantRawMenuSection } from "@/lib/leads/extraction/restaurant-crawler";
import { validateDemoSiteContent } from "@/lib/demo-sites/validation";
import { inferLocaleProfile } from "@/lib/i18n/locale";
import { buildSupportedLocales, resolvePrimaryLocale } from "@/lib/demo-sites/locale-resolution";
import { generateRestaurantTranslations } from "@/lib/demo-sites/multilingual";
import {
  getFallbackImagesForSection,
  getSectionImages,
  mergeSourceAndFallbackImages,
  type WebsiteImageRole,
  type WebsiteVisualImage,
} from "@/lib/demo-sites/image-augmentation";

function uniqueStrings(values: string[], limit = 60): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
    if (out.length >= limit) break;
  }

  return out;
}

function pickRestaurantName(crawl: RestaurantCrawlResult, fallback: string): { value: string; confidence: "high" | "medium" | "low"; candidates: string[] } {
  const logoAndHeader = uniqueStrings(
    crawl.pages.flatMap((page) => [...page.logoAltCandidates, ...page.headerBrandCandidates]),
    20,
  );
  const h1 = uniqueStrings(crawl.pages.flatMap((page) => page.h1), 20);
  const meta = uniqueStrings(crawl.pages.flatMap((page) => [page.ogTitle ?? "", page.metaTitle ?? "", page.title]), 20);
  const footer = uniqueStrings(crawl.pages.flatMap((page) => page.footerBrandCandidates), 20);

  const ordered = uniqueStrings([...logoAndHeader, ...h1, ...meta, ...footer], 40).filter((entry) => entry.length >= 2 && entry.length <= 90);
  if (logoAndHeader[0]) {
    return { value: logoAndHeader[0], confidence: "high", candidates: ordered };
  }
  if (h1[0]) {
    return { value: h1[0], confidence: "high", candidates: ordered };
  }
  if (meta[0]) {
    return { value: meta[0], confidence: "medium", candidates: ordered };
  }
  if (footer[0]) {
    return { value: footer[0], confidence: "medium", candidates: ordered };
  }

  return { value: fallback, confidence: "low", candidates: ordered };
}

function scoreColor(color: string): number {
  const hex = color.replace("#", "");
  if (hex.length !== 6) return 0;
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : ((max - min) / max) * 100;
  const brightness = (r + g + b) / 3;

  if (brightness < 20 || brightness > 245) {
    return 1;
  }
  return Math.round(saturation + (255 - Math.abs(140 - brightness)) / 6);
}

function pickBrandPalette(crawl: RestaurantCrawlResult): {
  primary?: string;
  secondary?: string;
  accent?: string;
  confidence: "high" | "medium" | "low" | "none";
  raw: string[];
} {
  const colors = uniqueStrings(crawl.pages.flatMap((page) => page.colors), 50)
    .map((color) => {
      const normalized = color.toLowerCase();
      if (!/^#[0-9a-f]{3,8}$/.test(normalized)) return undefined;
      if (normalized.length === 4) {
        return `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`;
      }
      return normalized.slice(0, 7);
    })
    .filter((value): value is string => Boolean(value));

  const scored = colors
    .map((color) => ({ color, score: scoreColor(color) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.color);

  const primary = scored[0];
  const secondary = scored[1];
  const accent = scored[2];

  const confidence: "high" | "medium" | "low" | "none" =
    scored.length >= 3 ? "high" : scored.length === 2 ? "medium" : scored.length === 1 ? "low" : "none";

  return { primary, secondary, accent, confidence, raw: scored.slice(0, 12) };
}

function sortImages(images: RestaurantRawImage[]): RestaurantRawImage[] {
  return [...images].sort((a, b) => (b.width * b.height) - (a.width * a.height));
}

function pickImages(crawl: RestaurantCrawlResult): {
  logoUrl?: string;
  heroImages: string[];
  galleryImages: string[];
  confidenceHero: "high" | "medium" | "low";
  confidenceGallery: "high" | "medium" | "low";
  all: RestaurantRawImage[];
} {
  const all = uniqueStrings(crawl.pages.flatMap((page) => page.images.map((image) => JSON.stringify(image))), 300)
    .map((value) => JSON.parse(value) as RestaurantRawImage)
    .filter((image) => image.role !== "decorative");

  const logo = all.find((image) => image.role === "logo");
  const hero = sortImages(all.filter((image) => image.role === "hero" || image.role === "food")).slice(0, 4);
  const gallery = sortImages(
    all.filter((image) => ["food", "interior", "gallery", "team", "unknown"].includes(image.role)),
  ).slice(0, 16);

  const confidenceHero: "high" | "medium" | "low" = hero.length >= 2 ? "high" : hero.length === 1 ? "medium" : "low";
  const confidenceGallery: "high" | "medium" | "low" = gallery.length >= 8 ? "high" : gallery.length >= 3 ? "medium" : "low";

  return {
    logoUrl: logo?.url,
    heroImages: uniqueStrings(hero.map((image) => image.url), 4),
    galleryImages: uniqueStrings(gallery.map((image) => image.url), 16),
    confidenceHero,
    confidenceGallery,
    all,
  };
}

function parseContact(crawl: RestaurantCrawlResult, lead: EnrichedCommerceLead["lead"]) {
  const phones = uniqueStrings(crawl.pages.flatMap((page) => page.contacts.phones), 8);
  const emails = uniqueStrings(crawl.pages.flatMap((page) => page.contacts.emails), 8);
  const addresses = uniqueStrings(crawl.pages.flatMap((page) => page.contacts.addresses), 8);
  const whatsapps = uniqueStrings(crawl.pages.flatMap((page) => page.contacts.whatsapps), 4);
  const reservationLinks = uniqueStrings(crawl.pages.flatMap((page) => page.contacts.reservationLinks), 6);
  const openingHours = uniqueStrings(crawl.pages.flatMap((page) => page.openingHours), 12);

  return {
    contact: {
      phone: phones[0] ?? lead.phone,
      email: emails[0] ?? lead.email,
      address: addresses[0] ?? lead.address,
      whatsapp: whatsapps[0],
    },
    openingHours,
    reservation: reservationLinks[0]
      ? {
          label: "Reserve a table",
          url: reservationLinks[0],
        }
      : undefined,
    confidence: (phones.length || emails.length || addresses.length) ? (phones.length + emails.length + addresses.length >= 3 ? "high" : "medium") : "low" as "high" | "medium" | "low",
  };
}

function parseMenu(crawl: RestaurantCrawlResult): {
  menuSections: RestaurantRawMenuSection[];
  menuPdfUrls: string[];
  menuPubliclyAvailable: boolean;
  confidence: "high" | "medium" | "low" | "none";
} {
  const mergedSections = crawl.pages.flatMap((page) => page.menuSections);
  const menuPdfUrls = uniqueStrings(crawl.pages.flatMap((page) => page.menuPdfUrls), 8);

  const normalized = uniqueStrings(mergedSections.map((section) => section.title), 20).map((title) => {
    const fromTitle = mergedSections.find((section) => section.title.toLowerCase() === title.toLowerCase());
    const items = uniqueStrings(
      mergedSections
        .filter((section) => section.title.toLowerCase() === title.toLowerCase())
        .flatMap((section) => section.items.map((item) => JSON.stringify(item))),
      120,
    ).map((item) => JSON.parse(item) as { name: string; description?: string; price?: string });

    return {
      title: fromTitle?.title ?? title,
      items,
    };
  }).filter((section) => section.items.length > 0);

  const itemCount = normalized.reduce((acc, section) => acc + section.items.length, 0);
  const menuPubliclyAvailable = itemCount > 0 || menuPdfUrls.length > 0;

  const confidence: "high" | "medium" | "low" | "none" =
    itemCount >= 15 ? "high" : itemCount >= 6 ? "medium" : itemCount > 0 || menuPdfUrls.length > 0 ? "low" : "none";

  return {
    menuSections: normalized,
    menuPdfUrls,
    menuPubliclyAvailable,
    confidence,
  };
}

function extractAboutAndHighlights(crawl: RestaurantCrawlResult, fallback: string): { aboutText?: string; shortDescription?: string; tagline?: string; signatureHighlights: string[]; contentConfidence: "high" | "medium" | "low" } {
  const headingHints = uniqueStrings(crawl.pages.flatMap((page) => page.headings), 30);
  const aboutCandidates = uniqueStrings(
    crawl.pages
      .flatMap((page) => page.paragraphs)
      .filter((line) => line.length >= 60 && line.length <= 550)
      .filter((line) => /welcome|story|about|fresh|chef|restaurant|cuisine|experience|tradition|signature/i.test(line)),
    20,
  );

  const shortDescription = aboutCandidates[0] ?? fallback;
  const aboutText = aboutCandidates[1] ?? aboutCandidates[0];
  const tagline = headingHints.find((heading) => heading.length >= 12 && heading.length <= 80 && !/menu|contact|gallery/i.test(heading));
  const signatureHighlights = headingHints
    .filter((heading) => /signature|dish|chef|seasonal|fresh|grill|dessert|cocktail|wine/i.test(heading))
    .slice(0, 6);

  const contentConfidence: "high" | "medium" | "low" =
    aboutCandidates.length >= 3 ? "high" : aboutCandidates.length >= 1 ? "medium" : "low";

  return {
    aboutText,
    shortDescription,
    tagline,
    signatureHighlights,
    contentConfidence,
  };
}

function socialLinks(crawl: RestaurantCrawlResult) {
  const serialized = uniqueStrings(
    crawl.pages.flatMap((page) => page.socialLinks.map((link) => JSON.stringify(link))),
    12,
  );

  return serialized.map((entry) => JSON.parse(entry) as { platform: string; url: string });
}

function toWebsiteImageRole(role: RestaurantRawImage["role"]): WebsiteImageRole {
  if (role === "food") return "food";
  if (role === "hero") return "hero";
  if (role === "interior") return "interior";
  if (role === "team") return "team";
  if (role === "logo") return "logo";
  if (role === "decorative") return "decorative";
  if (role === "gallery") return "gallery";
  return "unknown";
}

function buildRestaurantVisualAssets(params: {
  sourceImages: RestaurantRawImage[];
  category: "restaurant";
  localLocale: RestaurantLocaleCode;
  restaurantName: string;
}): { visualAssets: WebsiteVisualImage[]; heroImages: string[]; galleryImages: string[] } {
  const sourceAssetsBase: WebsiteVisualImage[] = params.sourceImages.map((image) => ({
    url: image.url,
    role: toWebsiteImageRole(image.role),
    sourceType: "source",
    sectionId: "gallery",
    origin: "source-crawl",
    alt: image.alt,
  }));

  const sourceHero = sourceAssetsBase.filter((image) => ["hero", "food", "interior", "gallery"].includes(image.role));
  const sourceMenu = sourceAssetsBase.filter((image) => ["food", "menu_item", "gallery"].includes(image.role));
  const sourceGallery = sourceAssetsBase.filter((image) => image.role !== "logo" && image.role !== "decorative");

  const heroAssets = mergeSourceAndFallbackImages({
    sourceImages: sourceHero.map((image) => ({ ...image, sectionId: "hero" })),
    fallbackImages: getFallbackImagesForSection({
      category: params.category,
      sectionId: "hero",
      preferredRoles: ["hero", "food", "dining_room", "interior"],
      limit: 6,
    }),
    minRequired: 2,
    maxTotal: 4,
  }).map((image) => ({
    ...image,
    altByLocale: {
      [params.localLocale]: `${params.restaurantName} - image principale`,
      en: `${params.restaurantName} - hero image`,
    },
  }));

  const menuAssets = mergeSourceAndFallbackImages({
    sourceImages: sourceMenu.map((image) => ({ ...image, sectionId: "menu" })),
    fallbackImages: getFallbackImagesForSection({
      category: params.category,
      sectionId: "menu",
      preferredRoles: ["menu_item", "food"],
      limit: 8,
    }),
    minRequired: 3,
    maxTotal: 8,
  }).map((image) => ({
    ...image,
    altByLocale: {
      [params.localLocale]: `${params.restaurantName} - menu`,
      en: `${params.restaurantName} - menu image`,
    },
  }));

  const galleryAssets = mergeSourceAndFallbackImages({
    sourceImages: sourceGallery.map((image) => ({ ...image, sectionId: "gallery" })),
    fallbackImages: getFallbackImagesForSection({
      category: params.category,
      sectionId: "gallery",
      preferredRoles: ["gallery", "food", "dining_room", "interior", "team"],
      limit: 16,
    }),
    minRequired: 8,
    maxTotal: 16,
  }).map((image) => ({
    ...image,
    altByLocale: {
      [params.localLocale]: `${params.restaurantName} - galerie`,
      en: `${params.restaurantName} - gallery`,
    },
  }));

  const logoAsset = sourceAssetsBase.find((image) => image.role === "logo")
    ? [{
        ...sourceAssetsBase.find((image) => image.role === "logo")!,
        sectionId: "brand",
        altByLocale: {
          [params.localLocale]: `${params.restaurantName} - logo`,
          en: `${params.restaurantName} - logo`,
        },
      }]
    : [];

  const visualAssets = [...logoAsset, ...heroAssets, ...menuAssets, ...galleryAssets]
    .filter((asset, index, array) => array.findIndex((candidate) => candidate.url === asset.url && candidate.sectionId === asset.sectionId) === index);

  return {
    visualAssets,
    heroImages: getSectionImages({ assets: visualAssets, sectionId: "hero", preferredRoles: ["hero", "food", "interior"], limit: 4 }).map((item) => item.url),
    galleryImages: getSectionImages({ assets: visualAssets, sectionId: "gallery", preferredRoles: ["gallery", "food", "interior", "team"], limit: 16 }).map((item) => item.url),
  };
}

function buildFallbackRestaurantContent(enriched: EnrichedCommerceLead): RestaurantContent {
  const locale = enriched.locale ?? inferLocaleProfile(enriched.lead.country);
  const primaryLocale = resolvePrimaryLocale(enriched.lead.city, enriched.lead.country);
  const supportedLocales = buildSupportedLocales(primaryLocale);

  return {
    restaurantName: enriched.lead.businessName,
    primaryLocale,
    supportedLocales,
    tagline: enriched.lead.description,
    shortDescription: enriched.inferredDescription,
    brandColors: {
      primary: "#231910",
      secondary: "#f4eee6",
      accent: "#b8833f",
    },
    heroImages: enriched.suggestedImages.slice(0, 3),
    galleryImages: enriched.suggestedImages.slice(0, 10),
    contact: {
      phone: enriched.lead.phone,
      email: enriched.lead.email,
      address: enriched.lead.address,
    },
    openingHours: enriched.lead.openingHours ? [enriched.lead.openingHours] : undefined,
    reservation: undefined,
    menuSections: [],
    menuPdfUrls: [],
    menuPubliclyAvailable: false,
    testimonials: [],
    aboutText: enriched.inferredDescription,
    signatureHighlights: enriched.inferredMenuItems.slice(0, 5),
    socialLinks: [],
    visualAssets: [],
    translations: {},
    sourceUrl: enriched.lead.website?.startsWith("http") ? enriched.lead.website : `https://${enriched.lead.website ?? locale.country}`,
    extractionConfidence: {
      content: "low",
      images: enriched.suggestedImages.length ? "medium" : "low",
      menu: "none",
      colors: "none",
    },
  };
}

export async function generateRestaurantDemoSiteContent(params: {
  enriched: EnrichedCommerceLead;
}): Promise<DemoSiteContent> {
  const { enriched } = params;
  const lead = enriched.lead;
  const primaryLocale = resolvePrimaryLocale(lead.city, lead.country) as RestaurantLocaleCode;
  const supportedLocales = buildSupportedLocales(primaryLocale) as RestaurantLocaleCode[];

  if (!lead.website) {
    const fallbackRestaurant = {
      ...buildFallbackRestaurantContent(enriched),
      primaryLocale,
      supportedLocales,
    };
    fallbackRestaurant.translations = await generateRestaurantTranslations({
      base: fallbackRestaurant,
      primaryLocale,
      supportedLocales,
    });
    return validateDemoSiteContent({
      businessInfo: {
        name: fallbackRestaurant.restaurantName,
        category: "restaurant",
        city: lead.city,
        country: lead.country ?? enriched.locale.country,
        address: fallbackRestaurant.contact.address,
        phone: fallbackRestaurant.contact.phone,
        email: fallbackRestaurant.contact.email,
        tagline: fallbackRestaurant.tagline,
        shortDescription: fallbackRestaurant.shortDescription,
      },
      theme: {
        primaryColor: fallbackRestaurant.brandColors.primary ?? "#231910",
        secondaryColor: fallbackRestaurant.brandColors.secondary ?? "#f4eee6",
        accentColor: fallbackRestaurant.brandColors.accent ?? "#b8833f",
        backgroundStyle: "atmospheric",
        headingFont: "Playfair Display",
        bodyFont: "Manrope",
        buttonVariant: "solid",
        borderRadius: "soft",
        tone: "luxury",
      },
      seo: {
        metaTitle: `${fallbackRestaurant.restaurantName} | ${lead.city}`,
        metaDescription: fallbackRestaurant.shortDescription ?? `${fallbackRestaurant.restaurantName} in ${lead.city}`,
      },
      contact: {
        contactName: fallbackRestaurant.restaurantName,
        email: fallbackRestaurant.contact.email,
        phone: fallbackRestaurant.contact.phone,
        bookingEnabled: true,
        formEnabled: true,
        openingHours: fallbackRestaurant.openingHours,
      },
      sections: [
        {
          id: "restaurant-hero-0",
          type: "hero",
          enabled: true,
          order: 0,
          content: {
            title: fallbackRestaurant.restaurantName,
            subtitle: fallbackRestaurant.shortDescription ?? "A premium dining destination.",
            primaryCta: {
              label: "Contact",
              href: "#contact",
            },
            image: fallbackRestaurant.heroImages[0],
          },
        },
      ],
      restaurantContent: fallbackRestaurant,
    });
  }

  const crawl = await crawlRestaurantWebsite(lead.website);
  if (!crawl) {
    const fallbackRestaurant = {
      ...buildFallbackRestaurantContent(enriched),
      primaryLocale,
      supportedLocales,
    };
    fallbackRestaurant.translations = await generateRestaurantTranslations({
      base: fallbackRestaurant,
      primaryLocale,
      supportedLocales,
    });
    const fallbackDiagnostics: RestaurantDiagnostics = {
      extractedRawContent: {
        pagesCrawled: [],
        candidateNames: [lead.businessName],
        aboutCandidates: fallbackRestaurant.aboutText ? [fallbackRestaurant.aboutText] : [],
        menuSectionTitles: [],
      },
      extractedImages: [],
      extractedBrandColors: [],
      missingFields: ["playwright_browser_unavailable_or_crawl_failed", "menuSections"],
      confidence: {
        restaurantName: "medium",
        colors: "none",
        menu: "none",
        heroImages: fallbackRestaurant.heroImages.length ? "medium" : "low",
        gallery: fallbackRestaurant.galleryImages.length ? "medium" : "low",
        contact: fallbackRestaurant.contact.phone || fallbackRestaurant.contact.email || fallbackRestaurant.contact.address ? "medium" : "low",
      },
    };

    return validateDemoSiteContent({
      businessInfo: {
        name: fallbackRestaurant.restaurantName,
        category: "restaurant",
        city: lead.city,
        country: lead.country ?? enriched.locale.country,
        address: fallbackRestaurant.contact.address,
        phone: fallbackRestaurant.contact.phone,
        email: fallbackRestaurant.contact.email,
        tagline: fallbackRestaurant.tagline,
        shortDescription: fallbackRestaurant.shortDescription,
      },
      theme: {
        primaryColor: fallbackRestaurant.brandColors.primary ?? "#231910",
        secondaryColor: fallbackRestaurant.brandColors.secondary ?? "#f4eee6",
        accentColor: fallbackRestaurant.brandColors.accent ?? "#b8833f",
        backgroundStyle: "atmospheric",
        headingFont: "Playfair Display",
        bodyFont: "Manrope",
        buttonVariant: "solid",
        borderRadius: "soft",
        tone: "luxury",
      },
      seo: {
        metaTitle: `${fallbackRestaurant.restaurantName} | ${lead.city}`,
        metaDescription: fallbackRestaurant.shortDescription ?? `${fallbackRestaurant.restaurantName} in ${lead.city}`,
      },
      contact: {
        contactName: fallbackRestaurant.restaurantName,
        email: fallbackRestaurant.contact.email,
        phone: fallbackRestaurant.contact.phone,
        bookingEnabled: true,
        formEnabled: true,
        openingHours: fallbackRestaurant.openingHours,
      },
      sections: [
        {
          id: "restaurant-hero-fallback-0",
          type: "hero",
          enabled: true,
          order: 0,
          content: {
            badge: lead.city,
            title: fallbackRestaurant.restaurantName,
            subtitle: fallbackRestaurant.shortDescription ?? "A premium dining destination.",
            primaryCta: {
              label: "Contact",
              href: "#contact",
            },
            image: fallbackRestaurant.heroImages[0] ?? fallbackRestaurant.galleryImages[0],
          },
        },
      ],
      restaurantContent: fallbackRestaurant,
      restaurantDiagnostics: fallbackDiagnostics,
    });
  }

  const name = pickRestaurantName(crawl, lead.businessName);
  const palette = pickBrandPalette(crawl);
  const imageSet = pickImages(crawl);
  const contact = parseContact(crawl, lead);
  const menu = parseMenu(crawl);
  const about = extractAboutAndHighlights(crawl, enriched.inferredDescription ?? `${lead.businessName} in ${lead.city}`);
  const socials = socialLinks(crawl);

  const testimonials = uniqueStrings(
    crawl.pages
      .flatMap((page) => page.paragraphs)
      .filter((line) => /review|testimonial|guest|customer|"/i.test(line))
      .slice(0, 6),
    6,
  ).map((text) => ({ text }));

  const visualLayer = buildRestaurantVisualAssets({
    sourceImages: imageSet.all,
    category: "restaurant",
    localLocale: primaryLocale,
    restaurantName: name.value,
  });

  const restaurantContent: RestaurantContent = {
    restaurantName: name.value,
    primaryLocale,
    supportedLocales,
    tagline: about.tagline,
    shortDescription: about.shortDescription,
    brandColors: {
      primary: palette.primary,
      secondary: palette.secondary,
      accent: palette.accent,
    },
    logoUrl: imageSet.logoUrl,
    heroImages: visualLayer.heroImages,
    galleryImages: visualLayer.galleryImages,
    contact: contact.contact,
    openingHours: contact.openingHours.length ? contact.openingHours : undefined,
    reservation: contact.reservation,
    menuSections: menu.menuSections,
    menuPdfUrls: menu.menuPdfUrls,
    menuPubliclyAvailable: menu.menuPubliclyAvailable,
    testimonials,
    aboutText: about.aboutText,
    signatureHighlights: about.signatureHighlights,
    socialLinks: socials,
    visualAssets: visualLayer.visualAssets,
    translations: {},
    sourceUrl: crawl.sourceUrl,
    extractionConfidence: {
      content: about.contentConfidence,
      images: imageSet.confidenceGallery,
      menu: menu.confidence,
      colors: palette.confidence,
    },
  };

  const missingFields: string[] = [];
  if (!restaurantContent.contact.phone) missingFields.push("contact.phone");
  if (!restaurantContent.contact.email) missingFields.push("contact.email");
  if (!restaurantContent.contact.address) missingFields.push("contact.address");
  if (!restaurantContent.menuPubliclyAvailable) missingFields.push("menuSections");
  if (!restaurantContent.heroImages.length) missingFields.push("heroImages");

  const diagnostics: RestaurantDiagnostics = {
    extractedRawContent: {
      pagesCrawled: crawl.pages.map((page) => page.url),
      candidateNames: name.candidates,
      aboutCandidates: uniqueStrings(crawl.pages.flatMap((page) => page.paragraphs), 10),
      menuSectionTitles: menu.menuSections.map((section) => section.title),
    },
    extractedImages: imageSet.all.slice(0, 40).map((image) => ({
      url: image.url,
      role: image.role,
      width: image.width,
      height: image.height,
      sourcePage: image.sourcePage,
    })),
    extractedBrandColors: palette.raw,
    missingFields,
    confidence: {
      restaurantName: name.confidence,
      colors: palette.confidence,
      menu: menu.confidence,
      heroImages: restaurantContent.heroImages.length >= 2 ? "high" : restaurantContent.heroImages.length ? "medium" : "low",
      gallery: restaurantContent.galleryImages.length >= 8 ? "high" : restaurantContent.galleryImages.length >= 3 ? "medium" : "low",
      contact: contact.confidence,
    },
  };

  restaurantContent.translations = await generateRestaurantTranslations({
    base: restaurantContent,
    primaryLocale,
    supportedLocales,
  });

  const primaryColor = restaurantContent.brandColors.primary ?? "#231910";
  const secondaryColor = restaurantContent.brandColors.secondary ?? "#f7efe6";
  const accentColor = restaurantContent.brandColors.accent ?? "#b8833f";

  return validateDemoSiteContent({
    businessInfo: {
      name: restaurantContent.restaurantName,
      category: "restaurant",
      city: lead.city,
      country: lead.country ?? enriched.locale.country,
      address: restaurantContent.contact.address,
      phone: restaurantContent.contact.phone,
      email: restaurantContent.contact.email,
      tagline: restaurantContent.tagline,
      shortDescription: restaurantContent.shortDescription,
    },
    theme: {
      primaryColor,
      secondaryColor,
      accentColor,
      backgroundStyle: "atmospheric",
      headingFont: "Playfair Display",
      bodyFont: "Manrope",
      buttonVariant: "solid",
      borderRadius: "soft",
      tone: "luxury",
    },
    seo: {
      metaTitle: `${restaurantContent.restaurantName} | ${lead.city}`,
      metaDescription: restaurantContent.shortDescription ?? `${restaurantContent.restaurantName} restaurant in ${lead.city}`,
    },
    contact: {
      contactName: restaurantContent.restaurantName,
      email: restaurantContent.contact.email,
      phone: restaurantContent.contact.phone,
      bookingEnabled: true,
      formEnabled: true,
      openingHours: restaurantContent.openingHours,
    },
    sections: [
      {
        id: "restaurant-hero-0",
        type: "hero",
        enabled: true,
        order: 0,
        content: {
          badge: lead.city,
          title: restaurantContent.restaurantName,
          subtitle: restaurantContent.shortDescription ?? "A refined dining experience.",
          primaryCta: {
            label: restaurantContent.reservation?.url ? "Reserve a table" : "Contact",
            href: restaurantContent.reservation?.url ?? "#contact",
          },
          secondaryCta: {
            label: "View menu",
            href: "#menu",
          },
          image: restaurantContent.heroImages[0] ?? restaurantContent.galleryImages[0],
        },
      },
      {
        id: "restaurant-contact-1",
        type: "contact",
        enabled: true,
        order: 1,
        content: {
          title: `Contact ${restaurantContent.restaurantName}`,
          address: restaurantContent.contact.address,
          phone: restaurantContent.contact.phone,
          email: restaurantContent.contact.email,
          hours: restaurantContent.openingHours,
        },
      },
    ],
    sourceReconstructedHtml: crawl.pages
      .map((page, index) => `<page index=\"${index}\" url=\"${page.url}\"><title>${page.title}</title></page>`)
      .join("\n"),
    restaurantContent,
    restaurantDiagnostics: diagnostics,
  });
}
