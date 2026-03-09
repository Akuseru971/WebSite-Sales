import { z } from "zod";
import type { DemoSiteContent, DemoSection, DemoSiteStyle } from "./types";

const categorySchema = z.enum(["taxi", "restaurant", "hotel", "real_estate"]);
const sectionTypeSchema = z.enum([
  "hero",
  "about",
  "services",
  "rooms",
  "amenities",
  "menu_highlights",
  "room_highlights",
  "featured_properties",
  "gallery",
  "stats",
  "coverage",
  "service_coverage",
  "testimonials",
  "faq",
  "cta",
  "contact"
]);

const densityModeSchema = z.enum(["airy", "balanced", "dense"]);
const visualMoodSchema = z.enum(["editorial", "immersive", "minimal", "boutique", "corporate", "warm", "bold"]);

const heroContentSchema = z.object({
  badge: z.string().optional(),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  primaryCta: z.object({ label: z.string().min(1), href: z.string().min(1) }),
  secondaryCta: z.object({ label: z.string().min(1), href: z.string().min(1) }).optional(),
  image: z.string().url().optional()
});

const servicesContentSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  items: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        icon: z.string().optional()
      })
    )
    .min(1)
});

const aboutContentSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  bullets: z.array(z.string()).optional()
});

const menuHighlightsContentSchema = z.object({
  title: z.string().min(1),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        priceHint: z.string().optional(),
        image: z.string().url().optional()
      })
    )
    .min(1)
});

const roomHighlightsContentSchema = z.object({
  title: z.string().min(1),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        capacityHint: z.string().optional(),
        image: z.string().url().optional()
      })
    )
    .min(1)
});

const featuredPropertiesContentSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  items: z
    .array(
      z.object({
        title: z.string().min(1),
        location: z.string().min(1),
        priceHint: z.string().min(1),
        type: z.string().min(1),
        image: z.string().url().optional()
      })
    )
    .min(1)
});

const galleryContentSchema = z.object({
  title: z.string().min(1),
  items: z.array(z.object({ image: z.string().url(), alt: z.string().min(1) })).min(1)
});

const statsContentSchema = z.object({
  title: z.string().optional(),
  items: z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })).min(1)
});

const coverageContentSchema = z.object({
  title: z.string().min(1),
  areas: z.array(z.string().min(1)).min(1),
  note: z.string().optional()
});

const testimonialsContentSchema = z.object({
  title: z.string().min(1),
  items: z
    .array(
      z.object({
        quote: z.string().min(1),
        author: z.string().min(1),
        role: z.string().optional()
      })
    )
    .min(1)
});

const faqContentSchema = z.object({
  title: z.string().min(1),
  items: z.array(z.object({ question: z.string().min(1), answer: z.string().min(1) })).min(1)
});

const ctaContentSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  action: z.object({ label: z.string().min(1), href: z.string().min(1) })
});

const contactContentSchema = z.object({
  title: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  hours: z.array(z.string()).optional(),
  mapsUrl: z.string().url().optional()
});

const demoSectionSchema: z.ZodType<DemoSection> = z.object({
  id: z.string().min(1),
  type: sectionTypeSchema,
  enabled: z.boolean().default(true),
  order: z.number().int().min(0),
  styleVariant: z.string().optional(),
  content: z.unknown()
}) as z.ZodType<DemoSection>;

export const demoSiteContentSchema: z.ZodType<DemoSiteContent> = z.object({
  businessInfo: z.object({
    name: z.string().min(1),
    category: categorySchema,
    city: z.string().min(1),
    country: z.string().min(1),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    whatsapp: z.string().optional(),
    tagline: z.string().optional(),
    shortDescription: z.string().optional()
  }),
  theme: z.object({
    primaryColor: z.string().min(1),
    secondaryColor: z.string().min(1),
    accentColor: z.string().min(1),
    backgroundStyle: z.string().min(1),
    headingFont: z.string().min(1),
    bodyFont: z.string().min(1),
    buttonVariant: z.enum(["solid", "outline", "ghost"]),
    borderRadius: z.enum(["rounded", "soft", "sharp"]),
    tone: z.enum(["premium", "warm", "corporate", "luxury", "modern"])
  }),
  seo: z.object({
    metaTitle: z.string().min(1),
    metaDescription: z.string().min(1),
    ogTitle: z.string().optional(),
    ogDescription: z.string().optional()
  }),
  contact: z.object({
    contactName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    whatsapp: z.string().optional(),
    bookingEnabled: z.boolean(),
    formEnabled: z.boolean(),
    openingHours: z.array(z.string()).optional(),
    mapEmbedUrl: z.string().optional()
  }),
  sections: z.array(demoSectionSchema).min(1),
  sourceReconstructedHtml: z.string().optional(),
  sourceStructureJson: z
    .object({
      pages: z.array(
        z.object({
          url: z.string().url(),
          title: z.string(),
          navItems: z.array(z.string()),
          sectionKeys: z.array(z.string()),
        }),
      ),
      nodes: z.array(
        z.object({
          pageUrl: z.string().url(),
          sectionKey: z.string(),
          heading: z.string().optional(),
          paragraphs: z.array(z.string()),
          ctas: z.array(z.string()),
          imageUrls: z.array(z.string().url()),
          order: z.number().int().min(0),
        }),
      ),
    })
    .optional(),
  sourceContentJson: z
    .object({
      headings: z.array(z.string()),
      paragraphs: z.array(z.string()),
      ctas: z.array(z.string()),
      services: z.array(z.string()),
      menuItems: z.array(z.string()),
      testimonials: z.array(z.string()),
      contacts: z.object({
        phones: z.array(z.string()),
        emails: z.array(z.string()),
        addresses: z.array(z.string()),
      }),
    })
    .optional(),
  sourceAssetsJson: z
    .object({
      logoUrl: z.string().url().optional(),
      heroImages: z.array(z.string().url()),
      galleryImages: z.array(z.string().url()),
      allImages: z.array(z.string().url()),
    })
    .optional(),
  generatedHtmlPreview: z
    .object({
      html: z.string().min(1),
      css: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  restaurantContent: z
    .object({
      restaurantName: z.string().min(1),
      primaryLocale: z.enum(["fr", "en", "pt", "es", "it", "de", "nl"]).optional().default("en"),
      supportedLocales: z.array(z.enum(["fr", "en", "pt", "es", "it", "de", "nl"])).min(1).optional().default(["en"]),
      tagline: z.string().optional(),
      shortDescription: z.string().optional(),
      brandColors: z.object({
        primary: z.string().optional(),
        secondary: z.string().optional(),
        accent: z.string().optional(),
      }),
      logoUrl: z.string().url().optional(),
      heroImages: z.array(z.string().url()),
      galleryImages: z.array(z.string().url()),
      contact: z.object({
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        whatsapp: z.string().optional(),
      }),
      openingHours: z.array(z.string()).optional(),
      reservation: z.object({
        label: z.string().optional(),
        url: z.string().url().optional(),
      }).optional(),
      menuSections: z.array(z.object({
        title: z.string().min(1),
        items: z.array(z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          price: z.string().optional(),
        })),
      })),
      menuPdfUrls: z.array(z.string().url()),
      menuPubliclyAvailable: z.boolean(),
      testimonials: z.array(z.object({
        author: z.string().optional(),
        text: z.string().min(1),
      })),
      aboutText: z.string().optional(),
      signatureHighlights: z.array(z.string()),
      socialLinks: z.array(z.object({
        platform: z.string().min(1),
        url: z.string().url(),
      })),
      visualAssets: z.array(
        z.object({
          url: z.string().url(),
          role: z.enum([
            "logo",
            "hero",
            "food",
            "menu_item",
            "dining_room",
            "interior",
            "room",
            "suite",
            "bathroom",
            "amenity",
            "transport",
            "vehicle",
            "property_exterior",
            "property_interior",
            "gallery",
            "team",
            "decorative",
            "unknown",
          ]),
          sourceType: z.enum(["source", "fallback"]),
          sectionId: z.string().min(1),
          origin: z.string().min(1),
          altByLocale: z
            .object({
              fr: z.string().optional(),
              en: z.string().optional(),
              pt: z.string().optional(),
              es: z.string().optional(),
              it: z.string().optional(),
              de: z.string().optional(),
              nl: z.string().optional(),
            })
            .optional(),
        }),
      ).optional().default([]),
      translations: z
        .object({
          fr: z
            .object({
              tagline: z.string().optional(),
              shortDescription: z.string().optional(),
              aboutText: z.string().optional(),
              sectionLabels: z.object({
                about: z.string(),
                menu: z.string(),
                gallery: z.string(),
                testimonials: z.string(),
                reservation: z.string(),
                details: z.string(),
              }),
              cta: z.object({
                reserve: z.string(),
                contact: z.string(),
                viewMenu: z.string(),
                openFullMenu: z.string(),
              }),
              menuSections: z.array(
                z.object({
                  title: z.string().min(1),
                  items: z.array(
                    z.object({
                      name: z.string().min(1),
                      description: z.string().optional(),
                      price: z.string().optional(),
                    }),
                  ),
                }),
              ),
              testimonialHeading: z.string().optional(),
              signatureHighlights: z.array(z.string()),
            })
            .optional(),
          en: z
            .object({
              tagline: z.string().optional(),
              shortDescription: z.string().optional(),
              aboutText: z.string().optional(),
              sectionLabels: z.object({
                about: z.string(),
                menu: z.string(),
                gallery: z.string(),
                testimonials: z.string(),
                reservation: z.string(),
                details: z.string(),
              }),
              cta: z.object({
                reserve: z.string(),
                contact: z.string(),
                viewMenu: z.string(),
                openFullMenu: z.string(),
              }),
              menuSections: z.array(
                z.object({
                  title: z.string().min(1),
                  items: z.array(
                    z.object({
                      name: z.string().min(1),
                      description: z.string().optional(),
                      price: z.string().optional(),
                    }),
                  ),
                }),
              ),
              testimonialHeading: z.string().optional(),
              signatureHighlights: z.array(z.string()),
            })
            .optional(),
          pt: z
            .object({
              tagline: z.string().optional(),
              shortDescription: z.string().optional(),
              aboutText: z.string().optional(),
              sectionLabels: z.object({
                about: z.string(),
                menu: z.string(),
                gallery: z.string(),
                testimonials: z.string(),
                reservation: z.string(),
                details: z.string(),
              }),
              cta: z.object({
                reserve: z.string(),
                contact: z.string(),
                viewMenu: z.string(),
                openFullMenu: z.string(),
              }),
              menuSections: z.array(
                z.object({
                  title: z.string().min(1),
                  items: z.array(
                    z.object({
                      name: z.string().min(1),
                      description: z.string().optional(),
                      price: z.string().optional(),
                    }),
                  ),
                }),
              ),
              testimonialHeading: z.string().optional(),
              signatureHighlights: z.array(z.string()),
            })
            .optional(),
          es: z
            .object({
              tagline: z.string().optional(),
              shortDescription: z.string().optional(),
              aboutText: z.string().optional(),
              sectionLabels: z.object({
                about: z.string(),
                menu: z.string(),
                gallery: z.string(),
                testimonials: z.string(),
                reservation: z.string(),
                details: z.string(),
              }),
              cta: z.object({
                reserve: z.string(),
                contact: z.string(),
                viewMenu: z.string(),
                openFullMenu: z.string(),
              }),
              menuSections: z.array(
                z.object({
                  title: z.string().min(1),
                  items: z.array(
                    z.object({
                      name: z.string().min(1),
                      description: z.string().optional(),
                      price: z.string().optional(),
                    }),
                  ),
                }),
              ),
              testimonialHeading: z.string().optional(),
              signatureHighlights: z.array(z.string()),
            })
            .optional(),
          it: z
            .object({
              tagline: z.string().optional(),
              shortDescription: z.string().optional(),
              aboutText: z.string().optional(),
              sectionLabels: z.object({
                about: z.string(),
                menu: z.string(),
                gallery: z.string(),
                testimonials: z.string(),
                reservation: z.string(),
                details: z.string(),
              }),
              cta: z.object({
                reserve: z.string(),
                contact: z.string(),
                viewMenu: z.string(),
                openFullMenu: z.string(),
              }),
              menuSections: z.array(
                z.object({
                  title: z.string().min(1),
                  items: z.array(
                    z.object({
                      name: z.string().min(1),
                      description: z.string().optional(),
                      price: z.string().optional(),
                    }),
                  ),
                }),
              ),
              testimonialHeading: z.string().optional(),
              signatureHighlights: z.array(z.string()),
            })
            .optional(),
          de: z
            .object({
              tagline: z.string().optional(),
              shortDescription: z.string().optional(),
              aboutText: z.string().optional(),
              sectionLabels: z.object({
                about: z.string(),
                menu: z.string(),
                gallery: z.string(),
                testimonials: z.string(),
                reservation: z.string(),
                details: z.string(),
              }),
              cta: z.object({
                reserve: z.string(),
                contact: z.string(),
                viewMenu: z.string(),
                openFullMenu: z.string(),
              }),
              menuSections: z.array(
                z.object({
                  title: z.string().min(1),
                  items: z.array(
                    z.object({
                      name: z.string().min(1),
                      description: z.string().optional(),
                      price: z.string().optional(),
                    }),
                  ),
                }),
              ),
              testimonialHeading: z.string().optional(),
              signatureHighlights: z.array(z.string()),
            })
            .optional(),
          nl: z
            .object({
              tagline: z.string().optional(),
              shortDescription: z.string().optional(),
              aboutText: z.string().optional(),
              sectionLabels: z.object({
                about: z.string(),
                menu: z.string(),
                gallery: z.string(),
                testimonials: z.string(),
                reservation: z.string(),
                details: z.string(),
              }),
              cta: z.object({
                reserve: z.string(),
                contact: z.string(),
                viewMenu: z.string(),
                openFullMenu: z.string(),
              }),
              menuSections: z.array(
                z.object({
                  title: z.string().min(1),
                  items: z.array(
                    z.object({
                      name: z.string().min(1),
                      description: z.string().optional(),
                      price: z.string().optional(),
                    }),
                  ),
                }),
              ),
              testimonialHeading: z.string().optional(),
              signatureHighlights: z.array(z.string()),
            })
            .optional(),
        })
        .optional()
        .default({}),
      sourceUrl: z.string().url(),
      extractionConfidence: z.object({
        content: z.enum(["high", "medium", "low"]),
        images: z.enum(["high", "medium", "low"]),
        menu: z.enum(["high", "medium", "low", "none"]),
        colors: z.enum(["high", "medium", "low", "none"]),
      }),
    })
    .optional(),
  restaurantDiagnostics: z
    .object({
      extractedRawContent: z.object({
        pagesCrawled: z.array(z.string().url()),
        candidateNames: z.array(z.string()),
        aboutCandidates: z.array(z.string()),
        menuSectionTitles: z.array(z.string()),
      }),
      extractedImages: z.array(z.object({
        url: z.string().url(),
        role: z.enum([
          "logo",
          "hero",
          "food",
          "menu_item",
          "dining_room",
          "interior",
          "room",
          "suite",
          "bathroom",
          "amenity",
          "transport",
          "vehicle",
          "property_exterior",
          "property_interior",
          "gallery",
          "team",
          "decorative",
          "unknown",
        ]),
        width: z.number().int().min(1),
        height: z.number().int().min(1),
        sourcePage: z.string().url(),
      })),
      extractedBrandColors: z.array(z.string()),
      missingFields: z.array(z.string()),
      confidence: z.object({
        restaurantName: z.enum(["high", "medium", "low"]),
        colors: z.enum(["high", "medium", "low", "none"]),
        menu: z.enum(["high", "medium", "low", "none"]),
        heroImages: z.enum(["high", "medium", "low"]),
        gallery: z.enum(["high", "medium", "low"]),
        contact: z.enum(["high", "medium", "low"]),
      }),
    })
    .optional(),
  extractedSiteProfile: z
    .object({
      sourceUrl: z.string().url(),
      extractedAt: z.string().min(1),
      businessIdentity: z
        .object({
          businessName: z.string().optional(),
          slogan: z.string().optional(),
          brandColors: z.array(z.string()).optional(),
          typographyFeel: z.string().optional(),
          visualTone: z.string().optional(),
          trustStyle: z.string().optional(),
          positioning: z.string().optional(),
          toneOfVoice: z.string().optional(),
          ctaStyle: z.string().optional()
        })
        .optional()
        .default({}),
      contentIdentity: z.object({
        headings: z.array(z.string()),
        aboutText: z.array(z.string()),
        services: z.array(z.string()),
        faqs: z.array(z.object({ question: z.string(), answer: z.string() })),
        testimonials: z.array(z.string()),
        trustSignals: z.array(z.string()),
        reservationWording: z.array(z.string()),
        locationWording: z.array(z.string()),
        contactDetails: z.object({
          phones: z.array(z.string()),
          emails: z.array(z.string()),
          addresses: z.array(z.string()),
          openingHours: z.array(z.string())
        })
      }),
      visualIdentity: z.object({
        logoUrl: z.string().url().optional(),
        heroImages: z.array(z.string().url()),
        galleryImages: z.array(z.string().url()),
        imageStyle: z.string().optional(),
        compositionDensity: densityModeSchema.optional(),
        moodDescriptors: z.array(z.string()),
        cardStyleHints: z.array(z.string()),
        buttonStyleHints: z.array(z.string())
      }),
      structuralIdentity: z.object({
        sectionMap: z.array(
          z.object({
            pageUrl: z.string().url(),
            navLabel: z.string().optional(),
            sectionTypeHint: z.string(),
            heading: z.string().optional(),
            order: z.number().int().min(0)
          })
        ),
        structureSummary: z.object({
          navItems: z.array(z.string()),
          homepageSectionOrder: z.array(z.string()),
          architectureType: z.enum(["immersive", "informational", "conversion", "corporate"]).optional(),
          majorSectionCount: z.number().int().min(0),
          repeatedPatterns: z.array(z.string())
        })
      }),
      redesignOpportunities: z.array(z.string()),
      sourceScreenshots: z.array(
        z.object({
          pageUrl: z.string().url(),
          label: z.string(),
          imageDataUrl: z.string().min(1)
        })
      )
    })
    .optional(),
  redesignPlan: z
    .object({
      brandPositioning: z.string(),
      visualMood: visualMoodSchema,
      toneOfVoice: z.string(),
      originalStructureSummary: z.string(),
      preserveElements: z.array(z.string()),
      improveElements: z.array(z.string()),
      mergeElements: z.array(z.string()),
      simplifyElements: z.array(z.string()),
      elevateElements: z.array(z.string()),
      suggestedSectionOrder: z.array(sectionTypeSchema),
      layoutDirection: z.string(),
      imageStrategy: z.string(),
      typographyDirection: z.string(),
      ctaStyle: z.string(),
      premiumUpgradeNotes: z.array(z.string())
    })
    .optional(),
  adaptiveSiteJson: z
    .object({
      heroVariant: z.enum(["split", "immersive", "centered", "showcase"]),
      sectionPresentation: z.enum(["editorial", "cards", "minimal", "immersive", "corporate"]),
      spacingRhythm: densityModeSchema,
      imageProminence: z.enum(["low", "medium", "high"]),
      typographyScale: z.enum(["compact", "balanced", "display"]),
      navStyle: z.enum(["minimal", "glass", "solid"]),
      animationStyle: z.enum(["subtle", "staggered", "cinematic"])
    })
    .optional()
}) as z.ZodType<DemoSiteContent>;

function isLegacyContent(input: unknown): input is { siteTitle?: string; category?: string; hero?: unknown; sections?: unknown[] } {
  if (!input || typeof input !== "object") {
    return false;
  }

  const candidate = input as Record<string, unknown>;
  const hasModernShape =
    typeof candidate.businessInfo === "object" ||
    typeof candidate.theme === "object" ||
    typeof candidate.contact === "object" ||
    typeof candidate.seo === "object";

  if (hasModernShape) {
    return false;
  }

  return typeof candidate.siteTitle === "string" || typeof candidate.hero === "object";
}

function getDefaultStyleForCategory(category: DemoSiteContent["businessInfo"]["category"]): DemoSiteStyle {
  switch (category) {
    case "taxi":
      return "urban";
    case "restaurant":
      return "atmospheric";
    case "hotel":
      return "luxury";
    case "real_estate":
      return "corporate";
  }
}

function validateSectionContent(section: DemoSection): DemoSection {
  switch (section.type) {
    case "hero":
      heroContentSchema.parse(section.content);
      return section;
    case "about":
      aboutContentSchema.parse(section.content);
      return section;
    case "services":
    case "amenities":
      servicesContentSchema.parse(section.content);
      return section;
    case "menu_highlights":
      menuHighlightsContentSchema.parse(section.content);
      return section;
    case "room_highlights":
    case "rooms":
      roomHighlightsContentSchema.parse(section.content);
      return section;
    case "featured_properties":
      featuredPropertiesContentSchema.parse(section.content);
      return section;
    case "gallery":
      galleryContentSchema.parse(section.content);
      return section;
    case "stats":
      statsContentSchema.parse(section.content);
      return section;
    case "coverage":
    case "service_coverage":
      coverageContentSchema.parse(section.content);
      return section;
    case "testimonials":
      testimonialsContentSchema.parse(section.content);
      return section;
    case "faq":
      faqContentSchema.parse(section.content);
      return section;
    case "cta":
      ctaContentSchema.parse(section.content);
      return section;
    case "contact":
      contactContentSchema.parse(section.content);
      return section;
    default:
      return section;
  }
}

export function normalizeDemoSiteContent(input: unknown): DemoSiteContent {
  const parsed = demoSiteContentSchema.safeParse(input);

  if (parsed.success) {
    return {
      ...parsed.data,
      sections: parsed.data.sections
        .map((section) => validateSectionContent(section))
        .sort((a, b) => a.order - b.order)
    };
  }

  if (!isLegacyContent(input)) {
    const details = parsed.error.issues
      .slice(0, 5)
      .map((issue) => {
        const path = issue.path.length ? issue.path.join(".") : "root";
        return `${path}: ${issue.message}`;
      })
      .join(" | ");
    throw new Error(`Invalid demo site content JSON structure. ${details}`);
  }

  const legacy = input as Record<string, unknown>;
  const category = categorySchema.parse(legacy.category ?? "restaurant");
  const heroRaw = heroContentSchema.parse(legacy.hero ?? {
    title: legacy.siteTitle ?? "Premium Business Experience",
    subtitle: legacy.siteSubtitle ?? "Professional website concept generated for outreach",
    primaryCta: { label: "Contact us", href: "#contact" }
  });
  const legacySections = Array.isArray(legacy.sections) ? legacy.sections : [];

  const sections: DemoSection[] = [
    {
      id: "hero",
      type: "hero",
      enabled: true,
      order: 0,
      styleVariant: "default",
      content: heroRaw
    }
  ];

  legacySections.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const raw = item as Record<string, unknown>;
    const rawType = (raw.type as string | undefined) ?? "about";
    const mappedType = rawType === "coverage" ? "service_coverage" : rawType;

    if (!sectionTypeSchema.safeParse(mappedType).success) {
      return;
    }

    const mappedSection = validateSectionContent({
      id: (raw.id as string | undefined) ?? `${mappedType}-${index + 1}`,
      type: mappedType as DemoSection["type"],
      enabled: true,
      order: index + 1,
      styleVariant: "default",
      content: (raw.content ?? {}) as DemoSection["content"]
    } as DemoSection);

    sections.push(mappedSection);
  });

  const normalized: DemoSiteContent = {
    businessInfo: {
      name: String(legacy.siteTitle ?? "Generated Demo Site"),
      category,
      city: String(legacy.city ?? "Unknown city"),
      country: String(legacy.country ?? "Unknown country"),
      tagline: String(legacy.siteSubtitle ?? "Premium demo website concept"),
      shortDescription: heroRaw.subtitle
    },
    theme: {
      primaryColor: "#111015",
      secondaryColor: "#f7f3ee",
      accentColor: "#a86f3f",
      backgroundStyle: getDefaultStyleForCategory(category),
      headingFont: "Cormorant Garamond",
      bodyFont: "Manrope",
      buttonVariant: "solid",
      borderRadius: "soft",
      tone: "premium"
    },
    seo: {
      metaTitle: `${legacy.siteTitle ?? "Generated Demo Site"} | Demo Preview`,
      metaDescription: String(legacy.siteSubtitle ?? "Generated website concept")
    },
    contact: {
      contactName: String(legacy.siteTitle ?? "Team"),
      bookingEnabled: false,
      formEnabled: true
    },
    sections: sections
      .map((section) => validateSectionContent(section))
      .sort((a, b) => a.order - b.order)
  };

  return normalized;
}

export function validateDemoSiteContent(input: unknown): DemoSiteContent {
  const normalized = normalizeDemoSiteContent(input);
  demoSiteContentSchema.parse(normalized);
  return normalized;
}

export function getValidationErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues
      .map((issue) => {
        const path = issue.path.join(".");
        return path ? `${path}: ${issue.message}` : issue.message;
      })
      .join("\n");
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown validation error.";
}
