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
