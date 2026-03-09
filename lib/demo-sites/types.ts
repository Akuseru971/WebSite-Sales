export type BusinessCategory = "taxi" | "restaurant" | "hotel" | "real_estate";

export type DemoSiteStyle = "urban" | "atmospheric" | "luxury" | "corporate";

export type SectionType =
  | "hero"
  | "about"
  | "services"
  | "rooms"
  | "amenities"
  | "menu_highlights"
  | "room_highlights"
  | "featured_properties"
  | "gallery"
  | "stats"
  | "coverage"
  | "service_coverage"
  | "testimonials"
  | "faq"
  | "cta"
  | "contact";

export type ThemeTone = "premium" | "warm" | "corporate" | "luxury" | "modern";

export type VisualMood =
  | "editorial"
  | "immersive"
  | "minimal"
  | "boutique"
  | "corporate"
  | "warm"
  | "bold";

export type DensityMode = "airy" | "balanced" | "dense";

export type HeroLayoutVariant = "split" | "immersive" | "centered" | "showcase";

export type SectionPresentation = "editorial" | "cards" | "minimal" | "immersive" | "corporate";

export interface SourceBrandSignals {
  businessName?: string;
  slogan?: string;
  brandColors?: string[];
  typographyFeel?: string;
  visualTone?: string;
  trustStyle?: string;
  positioning?: string;
  toneOfVoice?: string;
  ctaStyle?: string;
}

export interface SourceSectionMapItem {
  pageUrl: string;
  navLabel?: string;
  sectionTypeHint: string;
  heading?: string;
  order: number;
}

export interface SourceStructureSummary {
  navItems: string[];
  homepageSectionOrder: string[];
  architectureType?: "immersive" | "informational" | "conversion" | "corporate";
  majorSectionCount: number;
  repeatedPatterns: string[];
}

export interface SourceScreenshotAsset {
  pageUrl: string;
  label: string;
  imageDataUrl: string;
}

export interface ExtractedSiteProfile {
  sourceUrl: string;
  extractedAt: string;
  businessIdentity: SourceBrandSignals;
  contentIdentity: {
    headings: string[];
    aboutText: string[];
    services: string[];
    faqs: Array<{ question: string; answer: string }>;
    testimonials: string[];
    trustSignals: string[];
    reservationWording: string[];
    locationWording: string[];
    contactDetails: {
      phones: string[];
      emails: string[];
      addresses: string[];
      openingHours: string[];
    };
  };
  visualIdentity: {
    logoUrl?: string;
    heroImages: string[];
    galleryImages: string[];
    imageStyle?: string;
    compositionDensity?: DensityMode;
    moodDescriptors: string[];
    cardStyleHints: string[];
    buttonStyleHints: string[];
  };
  structuralIdentity: {
    sectionMap: SourceSectionMapItem[];
    structureSummary: SourceStructureSummary;
  };
  redesignOpportunities: string[];
  sourceScreenshots: SourceScreenshotAsset[];
}

export interface RedesignPlan {
  brandPositioning: string;
  visualMood: VisualMood;
  toneOfVoice: string;
  originalStructureSummary: string;
  preserveElements: string[];
  improveElements: string[];
  mergeElements: string[];
  simplifyElements: string[];
  elevateElements: string[];
  suggestedSectionOrder: SectionType[];
  layoutDirection: string;
  imageStrategy: string;
  typographyDirection: string;
  ctaStyle: string;
  premiumUpgradeNotes: string[];
}

export interface AdaptiveSiteComposition {
  heroVariant: HeroLayoutVariant;
  sectionPresentation: SectionPresentation;
  spacingRhythm: DensityMode;
  imageProminence: "low" | "medium" | "high";
  typographyScale: "compact" | "balanced" | "display";
  navStyle: "minimal" | "glass" | "solid";
  animationStyle: "subtle" | "staggered" | "cinematic";
}

export interface SourceStructureNode {
  pageUrl: string;
  sectionKey: string;
  heading?: string;
  paragraphs: string[];
  ctas: string[];
  imageUrls: string[];
  order: number;
}

export interface SourceStructureJson {
  pages: Array<{
    url: string;
    title: string;
    navItems: string[];
    sectionKeys: string[];
  }>;
  nodes: SourceStructureNode[];
}

export interface SourceContentJson {
  headings: string[];
  paragraphs: string[];
  ctas: string[];
  services: string[];
  menuItems: string[];
  testimonials: string[];
  contacts: {
    phones: string[];
    emails: string[];
    addresses: string[];
  };
}

export interface SourceAssetsJson {
  logoUrl?: string;
  heroImages: string[];
  galleryImages: string[];
  allImages: string[];
}

export interface GeneratedHtmlPreview {
  html: string;
  css?: string;
  metadata?: Record<string, unknown>;
}

export type ExtractionConfidenceLevel = "high" | "medium" | "low";
export type MenuConfidenceLevel = ExtractionConfidenceLevel | "none";
export type ColorConfidenceLevel = ExtractionConfidenceLevel | "none";
export type RestaurantLocaleCode = "fr" | "en" | "pt" | "es" | "it" | "de" | "nl";

export interface RestaurantVisualImage {
  url: string;
  role:
    | "logo"
    | "hero"
    | "food"
    | "menu_item"
    | "dining_room"
    | "interior"
    | "room"
    | "suite"
    | "bathroom"
    | "amenity"
    | "transport"
    | "vehicle"
    | "property_exterior"
    | "property_interior"
    | "gallery"
    | "team"
    | "decorative"
    | "unknown";
  sourceType: "source" | "fallback";
  sectionId: string;
  origin: string;
  altByLocale?: Partial<Record<RestaurantLocaleCode, string>>;
}

export interface RestaurantMenuItem {
  name: string;
  description?: string;
  price?: string;
}

export interface RestaurantMenuSection {
  title: string;
  items: RestaurantMenuItem[];
}

export interface RestaurantTestimonial {
  author?: string;
  text: string;
}

export interface RestaurantSocialLink {
  platform: string;
  url: string;
}

export interface RestaurantLocalizedContent {
  tagline?: string;
  shortDescription?: string;
  aboutText?: string;
  sectionLabels: {
    about: string;
    menu: string;
    gallery: string;
    testimonials: string;
    reservation: string;
    details: string;
  };
  cta: {
    reserve: string;
    contact: string;
    viewMenu: string;
    openFullMenu: string;
  };
  menuSections: RestaurantMenuSection[];
  testimonialHeading?: string;
  signatureHighlights: string[];
}

export interface RestaurantContent {
  restaurantName: string;
  primaryLocale: RestaurantLocaleCode;
  supportedLocales: RestaurantLocaleCode[];
  tagline?: string;
  shortDescription?: string;
  brandColors: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  logoUrl?: string;
  heroImages: string[];
  galleryImages: string[];
  contact: {
    phone?: string;
    email?: string;
    address?: string;
    whatsapp?: string;
  };
  openingHours?: string[];
  reservation?: {
    label?: string;
    url?: string;
  };
  menuSections: RestaurantMenuSection[];
  menuPdfUrls: string[];
  menuPubliclyAvailable: boolean;
  testimonials: RestaurantTestimonial[];
  aboutText?: string;
  signatureHighlights: string[];
  socialLinks: RestaurantSocialLink[];
  visualAssets: RestaurantVisualImage[];
  translations: Partial<Record<RestaurantLocaleCode, RestaurantLocalizedContent>>;
  sourceUrl: string;
  extractionConfidence: {
    content: ExtractionConfidenceLevel;
    images: ExtractionConfidenceLevel;
    menu: MenuConfidenceLevel;
    colors: ColorConfidenceLevel;
  };
}

export interface RestaurantDiagnostics {
  extractedRawContent: {
    pagesCrawled: string[];
    candidateNames: string[];
    aboutCandidates: string[];
    menuSectionTitles: string[];
  };
  extractedImages: Array<{
    url: string;
    role: "logo" | "hero" | "food" | "interior" | "gallery" | "team" | "decorative" | "unknown";
    width: number;
    height: number;
    sourcePage: string;
  }>;
  extractedBrandColors: string[];
  missingFields: string[];
  confidence: {
    restaurantName: ExtractionConfidenceLevel;
    colors: ColorConfidenceLevel;
    menu: MenuConfidenceLevel;
    heroImages: ExtractionConfidenceLevel;
    gallery: ExtractionConfidenceLevel;
    contact: ExtractionConfidenceLevel;
  };
}

export interface BusinessInfo {
  name: string;
  category: BusinessCategory;
  city: string;
  country: string;
  address?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  tagline?: string;
  shortDescription?: string;
}

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundStyle: string;
  headingFont: string;
  bodyFont: string;
  buttonVariant: "solid" | "outline" | "ghost";
  borderRadius: "rounded" | "soft" | "sharp";
  tone: ThemeTone;
}

export interface SeoConfig {
  metaTitle: string;
  metaDescription: string;
  ogTitle?: string;
  ogDescription?: string;
}

export interface SiteContactConfig {
  contactName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  bookingEnabled: boolean;
  formEnabled: boolean;
  openingHours?: string[];
  mapEmbedUrl?: string;
}

export interface HeroSectionContent {
  badge?: string;
  title: string;
  subtitle: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  image?: string;
}

export interface AboutSectionContent {
  title: string;
  body: string;
  bullets?: string[];
}

export interface ServiceItem {
  title: string;
  description: string;
  icon?: string;
}

export interface ServicesSectionContent {
  title: string;
  subtitle?: string;
  items: ServiceItem[];
}

export interface MenuHighlightItem {
  name: string;
  description: string;
  priceHint?: string;
  image?: string;
}

export interface MenuHighlightsContent {
  title: string;
  items: MenuHighlightItem[];
}

export interface RoomHighlightItem {
  name: string;
  description: string;
  capacityHint?: string;
  image?: string;
}

export interface RoomHighlightsContent {
  title: string;
  items: RoomHighlightItem[];
}

export interface PropertyItem {
  title: string;
  location: string;
  priceHint: string;
  type: string;
  image?: string;
}

export interface FeaturedPropertiesContent {
  title: string;
  subtitle?: string;
  items: PropertyItem[];
}

export interface GalleryItem {
  image: string;
  alt: string;
}

export interface GallerySectionContent {
  title: string;
  items: GalleryItem[];
}

export interface StatItem {
  label: string;
  value: string;
}

export interface StatsSectionContent {
  title?: string;
  items: StatItem[];
}

export interface CoverageSectionContent {
  title: string;
  areas: string[];
  note?: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  role?: string;
}

export interface TestimonialsSectionContent {
  title: string;
  items: Testimonial[];
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQSectionContent {
  title: string;
  items: FAQItem[];
}

export interface CTASectionContent {
  title: string;
  body: string;
  action: { label: string; href: string };
}

export interface ContactSectionContent {
  title: string;
  address?: string;
  phone?: string;
  email?: string;
  hours?: string[];
  mapsUrl?: string;
}

export interface BaseSection<TType extends SectionType, TContent> {
  id: string;
  type: TType;
  enabled: boolean;
  order: number;
  styleVariant?: string;
  content: TContent;
}

export type DemoSection =
  | BaseSection<"hero", HeroSectionContent>
  | BaseSection<"about", AboutSectionContent>
  | BaseSection<"services", ServicesSectionContent>
  | BaseSection<"rooms", RoomHighlightsContent>
  | BaseSection<"amenities", ServicesSectionContent>
  | BaseSection<"menu_highlights", MenuHighlightsContent>
  | BaseSection<"room_highlights", RoomHighlightsContent>
  | BaseSection<"featured_properties", FeaturedPropertiesContent>
  | BaseSection<"gallery", GallerySectionContent>
  | BaseSection<"stats", StatsSectionContent>
  | BaseSection<"coverage", CoverageSectionContent>
  | BaseSection<"service_coverage", CoverageSectionContent>
  | BaseSection<"testimonials", TestimonialsSectionContent>
  | BaseSection<"faq", FAQSectionContent>
  | BaseSection<"cta", CTASectionContent>
  | BaseSection<"contact", ContactSectionContent>;

export interface DemoSiteContent {
  businessInfo: BusinessInfo;
  theme: ThemeConfig;
  seo: SeoConfig;
  contact: SiteContactConfig;
  sections: DemoSection[];
  extractedSiteProfile?: ExtractedSiteProfile;
  sourceReconstructedHtml?: string;
  sourceStructureJson?: SourceStructureJson;
  sourceContentJson?: SourceContentJson;
  sourceAssetsJson?: SourceAssetsJson;
  generatedHtmlPreview?: GeneratedHtmlPreview;
  restaurantContent?: RestaurantContent;
  restaurantDiagnostics?: RestaurantDiagnostics;
  redesignPlan?: RedesignPlan;
  adaptiveSiteJson?: AdaptiveSiteComposition;
}

export interface DemoSiteRecord {
  id: string;
  leadId?: string;
  title?: string;
  slug: string;
  status: "draft" | "generated" | "archived";
  templateType: BusinessCategory;
  designStyle: DemoSiteStyle;
  previewUrl: string;
  createdAt: string;
  updatedAt: string;
  generatedContent: DemoSiteContent;
  extractedSiteProfileJson?: ExtractedSiteProfile;
  redesignPlanJson?: RedesignPlan;
  adaptiveSiteJson?: AdaptiveSiteComposition;
  sourceScreenshotsJson?: SourceScreenshotAsset[];
  sourceStructureJson?: SourceStructureJson;
  sourceBrandSignalsJson?: SourceBrandSignals;
  sourceReconstructedHtml?: string;
  sourceContentJson?: SourceContentJson;
  sourceAssetsJson?: SourceAssetsJson;
  redesignedSiteJson?: DemoSiteContent;
}

export interface DemoSiteVersion {
  id: string;
  demoSiteId: string;
  versionNumber: number;
  contentJson: DemoSiteContent;
  changeNote?: string;
  createdBy?: string;
  createdAt: string;
}

export interface SaveDemoSiteContentInput {
  demoSiteId: string;
  content: DemoSiteContent;
  changeNote?: string;
  createVersion?: boolean;
  actorUserId?: string;
  activityType?: string;
}
