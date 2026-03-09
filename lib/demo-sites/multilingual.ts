import OpenAI from "openai";
import type {
  RestaurantContent,
  RestaurantLocalizedContent,
  RestaurantLocaleCode,
} from "@/lib/demo-sites/types";
import { createResponseWithModelFallback } from "@/lib/openai/model-fallback";

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

function copyForLocale(locale: RestaurantLocaleCode): Partial<RestaurantLocalizedContent> {
  const map: Record<RestaurantLocaleCode, Partial<RestaurantLocalizedContent>> = {
    en: {
      sectionLabels: {
        about: "About",
        menu: "Menu",
        gallery: "Gallery",
        testimonials: "Testimonials",
        reservation: "Reservation",
        details: "Details",
      },
      cta: {
        reserve: "Reserve a table",
        contact: "Contact",
        viewMenu: "View menu",
        openFullMenu: "Open full menu",
      },
    },
    fr: {
      sectionLabels: {
        about: "A propos",
        menu: "Menu",
        gallery: "Galerie",
        testimonials: "Avis",
        reservation: "Reservation",
        details: "Details",
      },
      cta: {
        reserve: "Reserver une table",
        contact: "Contact",
        viewMenu: "Voir le menu",
        openFullMenu: "Ouvrir la carte",
      },
    },
    es: {
      sectionLabels: {
        about: "Sobre nosotros",
        menu: "Menu",
        gallery: "Galeria",
        testimonials: "Resenas",
        reservation: "Reserva",
        details: "Detalles",
      },
      cta: {
        reserve: "Reservar mesa",
        contact: "Contacto",
        viewMenu: "Ver menu",
        openFullMenu: "Abrir menu completo",
      },
    },
    pt: {
      sectionLabels: {
        about: "Sobre",
        menu: "Menu",
        gallery: "Galeria",
        testimonials: "Avaliacoes",
        reservation: "Reserva",
        details: "Detalhes",
      },
      cta: {
        reserve: "Reservar mesa",
        contact: "Contato",
        viewMenu: "Ver menu",
        openFullMenu: "Abrir menu completo",
      },
    },
    it: {
      sectionLabels: {
        about: "Chi siamo",
        menu: "Menu",
        gallery: "Galleria",
        testimonials: "Testimonianze",
        reservation: "Prenotazione",
        details: "Dettagli",
      },
      cta: {
        reserve: "Prenota un tavolo",
        contact: "Contatti",
        viewMenu: "Vedi menu",
        openFullMenu: "Apri menu completo",
      },
    },
    de: {
      sectionLabels: {
        about: "Uber uns",
        menu: "Speisekarte",
        gallery: "Galerie",
        testimonials: "Bewertungen",
        reservation: "Reservierung",
        details: "Details",
      },
      cta: {
        reserve: "Tisch reservieren",
        contact: "Kontakt",
        viewMenu: "Speisekarte ansehen",
        openFullMenu: "Vollstandiges Menu",
      },
    },
    nl: {
      sectionLabels: {
        about: "Over ons",
        menu: "Menu",
        gallery: "Galerij",
        testimonials: "Beoordelingen",
        reservation: "Reservering",
        details: "Details",
      },
      cta: {
        reserve: "Reserveer een tafel",
        contact: "Contact",
        viewMenu: "Bekijk menu",
        openFullMenu: "Open volledig menu",
      },
    },
  };

  return map[locale];
}

function buildFallbackLocalized(params: {
  base: RestaurantContent;
  primaryLocale: RestaurantLocaleCode;
  supportedLocales: RestaurantLocaleCode[];
}): Partial<Record<RestaurantLocaleCode, RestaurantLocalizedContent>> {
  const output: Partial<Record<RestaurantLocaleCode, RestaurantLocalizedContent>> = {};

  params.supportedLocales.forEach((locale) => {
    const copy = copyForLocale(locale);

    output[locale] = {
      tagline: params.base.tagline,
      shortDescription: params.base.shortDescription,
      aboutText: params.base.aboutText,
      signatureHighlights: params.base.signatureHighlights,
      sectionLabels: {
        about: copy.sectionLabels?.about ?? "About",
        menu: copy.sectionLabels?.menu ?? "Menu",
        gallery: copy.sectionLabels?.gallery ?? "Gallery",
        testimonials: copy.sectionLabels?.testimonials ?? "Testimonials",
        reservation: copy.sectionLabels?.reservation ?? "Reservation",
        details: copy.sectionLabels?.details ?? "Details",
      },
      cta: {
        reserve: copy.cta?.reserve ?? "Reserve a table",
        contact: copy.cta?.contact ?? "Contact",
        viewMenu: copy.cta?.viewMenu ?? "View menu",
        openFullMenu: copy.cta?.openFullMenu ?? "Open full menu",
      },
      menuSections: params.base.menuSections,
      testimonialHeading: copy.sectionLabels?.testimonials ?? "Testimonials",
    };
  });

  return output;
}

export async function generateRestaurantTranslations(params: {
  base: RestaurantContent;
  primaryLocale: RestaurantLocaleCode;
  supportedLocales: RestaurantLocaleCode[];
}): Promise<Partial<Record<RestaurantLocaleCode, RestaurantLocalizedContent>>> {
  const fallback = buildFallbackLocalized(params);
  const openai = getOpenAIClient();

  if (!openai || params.supportedLocales.length <= 1) {
    return fallback;
  }

  try {
    const response = await createResponseWithModelFallback(openai, {
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are a premium hospitality copywriter and translator. Return JSON only. Preserve business facts exactly (name, address, phones, emails, prices). Keep tone elegant and conversion-friendly. Keep dish names authentic when appropriate.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `Primary locale: ${params.primaryLocale}`,
                `Supported locales: ${params.supportedLocales.join(", ")}`,
                "Generate translations for textual fields only into each locale code.",
                "Expected shape: { locales: { [localeCode]: { tagline, shortDescription, aboutText, sectionLabels, cta, menuSections, testimonialHeading, signatureHighlights } } }",
                JSON.stringify({
                  restaurantName: params.base.restaurantName,
                  tagline: params.base.tagline,
                  shortDescription: params.base.shortDescription,
                  aboutText: params.base.aboutText,
                  menuSections: params.base.menuSections,
                  signatureHighlights: params.base.signatureHighlights,
                }, null, 2),
              ].join("\n\n"),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_object",
        },
      },
    });

    const output = response.output_text?.trim();
    if (!output) {
      return fallback;
    }

    const parsed = JSON.parse(output) as {
      locales?: Partial<Record<RestaurantLocaleCode, RestaurantLocalizedContent>>;
    };

    const merged: Partial<Record<RestaurantLocaleCode, RestaurantLocalizedContent>> = {
      ...fallback,
    };

    params.supportedLocales.forEach((locale) => {
      const fallbackLocale = fallback[locale];
      const aiLocale = parsed.locales?.[locale];

      merged[locale] = {
        ...fallbackLocale,
        ...aiLocale,
        sectionLabels: {
          ...(fallbackLocale?.sectionLabels ?? {}),
          ...(aiLocale?.sectionLabels ?? {}),
        },
        cta: {
          ...(fallbackLocale?.cta ?? {}),
          ...(aiLocale?.cta ?? {}),
        },
        menuSections: aiLocale?.menuSections?.length
          ? aiLocale.menuSections
          : fallbackLocale?.menuSections,
        signatureHighlights: aiLocale?.signatureHighlights?.length
          ? aiLocale.signatureHighlights
          : fallbackLocale?.signatureHighlights,
      } as RestaurantLocalizedContent;
    });

    return merged;
  } catch {
    return fallback;
  }
}
