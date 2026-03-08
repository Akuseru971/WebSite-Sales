import type { BusinessCategory } from "@/lib/demo-sites/types";

export interface CommerceLead {
  id: string;
  businessName: string;
  category: BusinessCategory;
  city: string;
  district?: string;
  contactName?: string;
  phone?: string;
}

export const mockCommerceLeads: CommerceLead[] = [
  {
    id: "lead-paris-taxi-1",
    businessName: "Alpha Taxi Paris",
    category: "taxi",
    city: "Paris",
    district: "8e",
    contactName: "Lucas Bernard",
    phone: "+33 1 44 00 12 91"
  },
  {
    id: "lead-paris-restaurant-1",
    businessName: "Maison Saffran",
    category: "restaurant",
    city: "Paris",
    district: "2e",
    contactName: "Nina Lemaire",
    phone: "+33 1 42 11 35 77"
  },
  {
    id: "lead-paris-hotel-1",
    businessName: "Hotel des Arcades",
    category: "hotel",
    city: "Paris",
    district: "9e",
    contactName: "Julien Morel",
    phone: "+33 1 45 88 19 46"
  },
  {
    id: "lead-lyon-restaurant-1",
    businessName: "Le Quai des Saveurs",
    category: "restaurant",
    city: "Lyon",
    district: "Presqu'ile",
    contactName: "Camille Roche",
    phone: "+33 4 72 10 82 00"
  },
  {
    id: "lead-lyon-real-estate-1",
    businessName: "Lyon Patrimoine Conseil",
    category: "real_estate",
    city: "Lyon",
    district: "Part-Dieu",
    contactName: "Florian Perrin",
    phone: "+33 4 78 54 22 31"
  },
  {
    id: "lead-nice-hotel-1",
    businessName: "Azure Horizon Suites",
    category: "hotel",
    city: "Nice",
    district: "Promenade",
    contactName: "Elena Vilar",
    phone: "+33 4 93 71 88 02"
  },
  {
    id: "lead-nice-taxi-1",
    businessName: "Riviera Ride Service",
    category: "taxi",
    city: "Nice",
    district: "Centre",
    contactName: "Yanis Arnaud",
    phone: "+33 4 93 41 29 90"
  },
  {
    id: "lead-bordeaux-real-estate-1",
    businessName: "Garonne Immo Select",
    category: "real_estate",
    city: "Bordeaux",
    district: "Chartrons",
    contactName: "Helene Dupont",
    phone: "+33 5 56 72 30 15"
  },
  {
    id: "lead-bordeaux-restaurant-1",
    businessName: "Atelier du Vin Rouge",
    category: "restaurant",
    city: "Bordeaux",
    district: "Saint-Pierre",
    contactName: "Arthur Rigal",
    phone: "+33 5 56 31 68 21"
  },
  {
    id: "lead-marseille-hotel-1",
    businessName: "Port Bleu Hotel",
    category: "hotel",
    city: "Marseille",
    district: "Vieux-Port",
    contactName: "Sofia Garnier",
    phone: "+33 4 91 18 63 74"
  },
  {
    id: "lead-marseille-taxi-1",
    businessName: "MetroCab Marseille",
    category: "taxi",
    city: "Marseille",
    district: "Prado",
    contactName: "Rayan Bousquet",
    phone: "+33 4 91 45 02 87"
  },
  {
    id: "lead-lille-real-estate-1",
    businessName: "Nord Habitat Premium",
    category: "real_estate",
    city: "Lille",
    district: "Euralille",
    contactName: "Lea Monnier",
    phone: "+33 3 20 55 90 48"
  }
];
