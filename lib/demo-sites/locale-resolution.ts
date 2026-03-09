import type { SupportedLanguage } from "@/lib/i18n/locale";

const countryToLanguage: Record<string, SupportedLanguage> = {
  france: "fr",
  belgique: "fr",
  belgium: "fr",
  suisse: "fr",
  switzerland: "fr",
  canada: "fr",
  portugal: "pt",
  brazil: "pt",
  brasil: "pt",
  spain: "es",
  espana: "es",
  germany: "de",
  deutschland: "de",
  italy: "it",
  italia: "it",
  austria: "de",
  belgium_nl: "nl",
  netherlands: "nl",
  nederland: "nl",
  uk: "en",
  "united kingdom": "en",
  "united states": "en",
  usa: "en",
  ireland: "en",
};

const cityHints: Array<{ pattern: RegExp; language: SupportedLanguage }> = [
  { pattern: /paris|lyon|marseille|bordeaux|lille|nice|toulouse/i, language: "fr" },
  { pattern: /madrid|barcelona|sevilla|valencia|bilbao/i, language: "es" },
  { pattern: /rome|roma|milan|milano|naples|napoli|florence|firenze/i, language: "it" },
  { pattern: /lisbon|lisboa|porto|braga|coimbra|sao paulo|rio/i, language: "pt" },
  { pattern: /berlin|munich|muenchen|hamburg|frankfurt|cologne|koln/i, language: "de" },
  { pattern: /amsterdam|rotterdam|utrecht|the hague|den haag/i, language: "nl" },
];

function normalize(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}

export function resolvePrimaryLocale(city?: string, country?: string): SupportedLanguage {
  const normalizedCountry = normalize(country);
  if (normalizedCountry && countryToLanguage[normalizedCountry]) {
    return countryToLanguage[normalizedCountry];
  }

  const normalizedCity = normalize(city);
  if (normalizedCity) {
    const matched = cityHints.find((entry) => entry.pattern.test(normalizedCity));
    if (matched) {
      return matched.language;
    }
  }

  return "en";
}

export function buildSupportedLocales(primaryLocale: SupportedLanguage): SupportedLanguage[] {
  if (primaryLocale === "en") {
    return ["en"];
  }

  return [primaryLocale, "en"];
}
