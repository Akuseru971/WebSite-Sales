import type { DemoSection } from "@/lib/demo-sites/types";
import { AboutSection } from "@/components/demo-site/sections/about-section";
import { ServicesSection } from "@/components/demo-site/sections/services-section";
import { MenuHighlightsSection } from "@/components/demo-site/sections/menu-highlights-section";
import { RoomHighlightsSection } from "@/components/demo-site/sections/room-highlights-section";
import { FeaturedPropertiesSection } from "@/components/demo-site/sections/featured-properties-section";
import { GallerySection } from "@/components/demo-site/sections/gallery-section";
import { StatsSection } from "@/components/demo-site/sections/stats-section";
import { ServiceCoverageSection } from "@/components/demo-site/sections/service-coverage-section";
import { TestimonialsSection } from "@/components/demo-site/sections/testimonials-section";
import { FAQSection } from "@/components/demo-site/sections/faq-section";
import { CTASection } from "@/components/demo-site/sections/cta-section";
import { ContactSection } from "@/components/demo-site/sections/contact-section";

interface SectionRendererProps {
  section: DemoSection;
}

export function SectionRenderer({ section }: SectionRendererProps) {
  switch (section.type) {
    case "hero":
      return null;
    case "about":
      return <AboutSection content={section.content} />;
    case "services":
      return <ServicesSection content={section.content} />;
    case "amenities":
      return <ServicesSection content={section.content} />;
    case "menu_highlights":
      return <MenuHighlightsSection content={section.content} />;
    case "room_highlights":
      return <RoomHighlightsSection content={section.content} />;
    case "rooms":
      return <RoomHighlightsSection content={section.content} />;
    case "featured_properties":
      return <FeaturedPropertiesSection content={section.content} />;
    case "gallery":
      return <GallerySection content={section.content} />;
    case "stats":
      return <StatsSection content={section.content} />;
    case "coverage":
      return <ServiceCoverageSection content={section.content} />;
    case "service_coverage":
      return <ServiceCoverageSection content={section.content} />;
    case "testimonials":
      return <TestimonialsSection content={section.content} />;
    case "faq":
      return <FAQSection content={section.content} />;
    case "cta":
      return <CTASection content={section.content} />;
    case "contact":
      return <ContactSection content={section.content} />;
    default:
      return null;
  }
}
