import type { DemoSiteRecord } from "@/lib/demo-sites/types";
import { TaxiTemplate } from "@/components/demo-site/templates/taxi-template";
import { RestaurantTemplate } from "@/components/demo-site/templates/restaurant-template";
import { HotelTemplate } from "@/components/demo-site/templates/hotel-template";
import { RealEstateTemplate } from "@/components/demo-site/templates/real-estate-template";

interface DemoTemplateRendererProps {
  site: DemoSiteRecord;
}

export function DemoTemplateRenderer({ site }: DemoTemplateRendererProps) {
  switch (site.templateType) {
    case "taxi":
      return <TaxiTemplate site={site} />;
    case "restaurant":
      return <RestaurantTemplate site={site} />;
    case "hotel":
      return <HotelTemplate site={site} />;
    case "real_estate":
      return <RealEstateTemplate site={site} />;
    default:
      return null;
  }
}
