export type SupportedLanguage = "fr" | "en" | "es" | "de" | "it" | "pt" | "nl";

export interface LocaleProfile {
  country: string;
  language: SupportedLanguage;
  languageLabel: string;
  ccTld: string;
}

const countryToLocale: Record<string, Omit<LocaleProfile, "country">> = {
  france: { language: "fr", languageLabel: "French", ccTld: "fr" },
  belgique: { language: "fr", languageLabel: "French", ccTld: "be" },
  belgium: { language: "fr", languageLabel: "French", ccTld: "be" },
  suisse: { language: "fr", languageLabel: "French", ccTld: "ch" },
  switzerland: { language: "fr", languageLabel: "French", ccTld: "ch" },
  canada: { language: "fr", languageLabel: "French", ccTld: "ca" },
  spain: { language: "es", languageLabel: "Spanish", ccTld: "es" },
  espana: { language: "es", languageLabel: "Spanish", ccTld: "es" },
  germany: { language: "de", languageLabel: "German", ccTld: "de" },
  deutschland: { language: "de", languageLabel: "German", ccTld: "de" },
  italy: { language: "it", languageLabel: "Italian", ccTld: "it" },
  italia: { language: "it", languageLabel: "Italian", ccTld: "it" },
  portugal: { language: "pt", languageLabel: "Portuguese", ccTld: "pt" },
  netherlands: { language: "nl", languageLabel: "Dutch", ccTld: "nl" },
  nederland: { language: "nl", languageLabel: "Dutch", ccTld: "nl" },
  "united kingdom": { language: "en", languageLabel: "English", ccTld: "uk" },
  uk: { language: "en", languageLabel: "English", ccTld: "uk" },
  usa: { language: "en", languageLabel: "English", ccTld: "com" },
  "united states": { language: "en", languageLabel: "English", ccTld: "com" },
  ireland: { language: "en", languageLabel: "English", ccTld: "ie" }
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function inferLocaleProfile(country?: string): LocaleProfile {
  const normalizedCountry = country ? normalize(country) : "";
  const mapped = normalizedCountry ? countryToLocale[normalizedCountry] : undefined;

  if (mapped) {
    return {
      country: country as string,
      language: mapped.language,
      languageLabel: mapped.languageLabel,
      ccTld: mapped.ccTld
    };
  }

  return {
    country: country?.trim() || "France",
    language: "fr",
    languageLabel: "French",
    ccTld: "fr"
  };
}
