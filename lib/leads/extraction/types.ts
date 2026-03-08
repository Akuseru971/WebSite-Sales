export interface ExtractedImageAsset {
  url: string;
  alt: string;
  width: number;
  height: number;
  sourcePage: string;
  role: "logo" | "hero" | "gallery" | "content";
}

export interface ExtractedPageContent {
  url: string;
  title: string;
  description: string;
  headings: string[];
  paragraphs: string[];
  ctaPhrases: string[];
  images: ExtractedImageAsset[];
  links: string[];
}

export interface ExtractedContactDetails {
  phones: string[];
  emails: string[];
  addresses: string[];
}

export interface ExtractedThemeHints {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

export interface ExtractedScreenshot {
  pageUrl: string;
  label: string;
  imageDataUrl: string;
}

export interface StructuredBusinessExtraction {
  sourceWebsite: string;
  crawledAt: string;
  pages: ExtractedPageContent[];
  logo?: ExtractedImageAsset;
  heroImages: ExtractedImageAsset[];
  galleryImages: ExtractedImageAsset[];
  keyHeadings: string[];
  aboutText: string[];
  serviceDescriptions: string[];
  ctaPhrases: string[];
  contact: ExtractedContactDetails;
  themeHints: ExtractedThemeHints;
  pageStructureHints: string[];
  screenshots: ExtractedScreenshot[];
  navItems: string[];
  toneHints: string[];
}
