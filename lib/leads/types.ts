import type { BusinessCategory } from "@/lib/demo-sites/types";

export interface CommerceLead {
  id: string;
  businessName: string;
  category: BusinessCategory;
  city: string;
  district?: string;
  address?: string;
  postcode?: string;
  country?: string;
  contactName?: string;
  phone?: string;
  website?: string;
  email?: string;
  openingHours?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  source?: "openstreetmap" | "website" | "hybrid";
}
