import type { BusinessCategory } from "@/lib/demo-sites/types";

export interface CommerceLead {
  id: string;
  businessName: string;
  category: BusinessCategory;
  city: string;
  district?: string;
  contactName?: string;
  phone?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  source?: "openstreetmap";
}
