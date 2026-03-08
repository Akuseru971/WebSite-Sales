import type { DemoSiteRecord } from "./types";
import { getFallbackImage } from "./image-fallbacks";
import { normalizeDemoSiteContent } from "./validation";

const now = new Date().toISOString();

type SeededDemoSiteRaw = Omit<DemoSiteRecord, "generatedContent"> & {
  generatedContent: Record<string, unknown>;
};

const SEEDED_DEMO_SITES_RAW: SeededDemoSiteRaw[] = [
  {
    id: "demo-taxi-1",
    slug: "cityline-taxi-paris",
    status: "generated",
    templateType: "taxi",
    designStyle: "urban",
    previewUrl: "/preview/cityline-taxi-paris",
    createdAt: now,
    updatedAt: now,
    generatedContent: {
      siteTitle: "CityLine Chauffeurs",
      siteSubtitle: "Private and airport transfers in Paris, 24/7",
      category: "taxi",
      style: "urban",
      city: "Paris",
      hero: {
        badge: "Premium Local Transport",
        title: "Your trusted ride partner in Paris",
        subtitle:
          "Executive transfers, on-demand city rides, and seamless airport pickup with professional chauffeurs.",
        primaryCta: { label: "Book your ride", href: "#contact" },
        secondaryCta: { label: "Request a transfer", href: "#services" },
        image: getFallbackImage("taxi", 0)
      },
      sections: [
        {
          type: "stats",
          id: "stats",
          content: {
            items: [
              { label: "Average pickup time", value: "8 min" },
              { label: "Customer rating", value: "4.9/5" },
              { label: "Availability", value: "24/7" }
            ]
          }
        },
        {
          type: "services",
          id: "services",
          content: {
            title: "Transport designed for your schedule",
            subtitle: "Fast, transparent, and premium service quality",
            items: [
              {
                title: "Airport transfer",
                description: "Fixed-rate pickup and drop-off with real-time flight monitoring."
              },
              {
                title: "City rides",
                description: "Smooth local rides for meetings, shopping, and daily mobility."
              },
              {
                title: "Private chauffeur",
                description: "Dedicated professional driver for business and special occasions."
              }
            ]
          }
        },
        {
          type: "coverage",
          id: "coverage",
          content: {
            title: "Service coverage",
            areas: ["Central Paris", "La Defense", "CDG Airport", "Orly Airport", "Versailles"],
            note: "Need a custom itinerary? Our dispatch team handles tailored routes on demand."
          }
        },
        {
          type: "testimonials",
          id: "testimonials",
          content: {
            title: "What riders say",
            items: [
              {
                quote: "Always on time and very professional. My go-to for airport transfers.",
                author: "Sophie Martin"
              },
              {
                quote: "The booking process is quick and the cars are spotless.",
                author: "David Laurent"
              }
            ]
          }
        },
        {
          type: "cta",
          id: "cta",
          content: {
            title: "Need a ride in the next hour?",
            body: "Reserve now and receive instant confirmation from our local operations team.",
            action: { label: "Contact our team", href: "#contact" }
          }
        },
        {
          type: "contact",
          id: "contact",
          content: {
            title: "Book your transfer",
            address: "17 Rue de Rivoli, 75001 Paris",
            phone: "+33 1 40 00 00 00",
            email: "booking@citylinechauffeurs.fr",
            hours: ["Mon-Sun: 24/7 Service"]
          }
        }
      ]
    }
  },
  {
    id: "demo-restaurant-1",
    slug: "atelier-olive-lyon",
    status: "generated",
    templateType: "restaurant",
    designStyle: "atmospheric",
    previewUrl: "/preview/atelier-olive-lyon",
    createdAt: now,
    updatedAt: now,
    generatedContent: {
      siteTitle: "Atelier Olive",
      siteSubtitle: "Contemporary Mediterranean dining in Lyon",
      category: "restaurant",
      style: "atmospheric",
      city: "Lyon",
      hero: {
        badge: "Fine Dining Experience",
        title: "An intimate table where flavors tell a story",
        subtitle:
          "Seasonal products, expressive plates, and warm hospitality in the heart of Lyon.",
        primaryCta: { label: "Reserve your table", href: "#contact" },
        secondaryCta: { label: "Discover our menu", href: "#menu" },
        image: getFallbackImage("restaurant", 0)
      },
      sections: [
        {
          type: "about",
          id: "about",
          content: {
            title: "A kitchen rooted in craft",
            body: "Atelier Olive blends Mediterranean tradition with modern culinary techniques, creating a refined yet welcoming dining experience.",
            bullets: [
              "Seasonal ingredients sourced from trusted regional producers",
              "A curated wine pairing program",
              "Vegetarian and tasting menu experiences"
            ]
          }
        },
        {
          type: "menu_highlights",
          id: "menu",
          content: {
            title: "Signature dishes",
            items: [
              {
                name: "Charcoal Octopus",
                description: "Smoked paprika emulsion, confit lemon, and fennel textures.",
                priceHint: "EUR 24",
                image: getFallbackImage("restaurant", 1)
              },
              {
                name: "Lobster Linguine",
                description: "Fresh pasta, bisque reduction, herbs, and citrus oil.",
                priceHint: "EUR 34",
                image: getFallbackImage("restaurant", 2)
              },
              {
                name: "Pistachio Souffle",
                description: "Warm center, orange blossom cream, and candied almonds.",
                priceHint: "EUR 14",
                image: getFallbackImage("restaurant", 0)
              }
            ]
          }
        },
        {
          type: "gallery",
          id: "gallery",
          content: {
            title: "Atmosphere",
            items: [
              { image: getFallbackImage("restaurant", 0), alt: "Dining room with warm lighting" },
              { image: getFallbackImage("restaurant", 1), alt: "Chef plating dish" },
              { image: getFallbackImage("restaurant", 2), alt: "Signature dish close-up" }
            ]
          }
        },
        {
          type: "testimonials",
          id: "testimonials",
          content: {
            title: "Guest impressions",
            items: [
              {
                quote: "Beautiful ambiance and unforgettable flavors. Perfect for special dinners.",
                author: "Claire B."
              },
              {
                quote: "Service was attentive and every plate felt intentional.",
                author: "Marc R."
              }
            ]
          }
        },
        {
          type: "cta",
          id: "cta",
          content: {
            title: "Reserve an exceptional evening",
            body: "Secure your table now and let our team craft your dining experience.",
            action: { label: "Book now", href: "#contact" }
          }
        },
        {
          type: "contact",
          id: "contact",
          content: {
            title: "Visit Atelier Olive",
            address: "42 Quai Saint-Antoine, 69002 Lyon",
            phone: "+33 4 72 00 00 00",
            email: "reservations@atelierolive.fr",
            hours: ["Tue-Sat: 12:00-14:30", "Tue-Sat: 19:00-22:30", "Sun-Mon: Closed"]
          }
        }
      ]
    }
  },
  {
    id: "demo-hotel-1",
    slug: "harbor-grand-nice",
    status: "generated",
    templateType: "hotel",
    designStyle: "luxury",
    previewUrl: "/preview/harbor-grand-nice",
    createdAt: now,
    updatedAt: now,
    generatedContent: {
      siteTitle: "Harbor Grand Nice",
      siteSubtitle: "Seaside luxury retreat on the Cote d'Azur",
      category: "hotel",
      style: "luxury",
      city: "Nice",
      hero: {
        badge: "Five-Star Hospitality",
        title: "A serene escape above the Mediterranean",
        subtitle:
          "Elegant suites, attentive service, and breathtaking views designed for unforgettable stays.",
        primaryCta: { label: "Book your escape", href: "#contact" },
        secondaryCta: { label: "Discover our rooms", href: "#rooms" },
        image: getFallbackImage("hotel", 0)
      },
      sections: [
        {
          type: "room_highlights",
          id: "rooms",
          content: {
            title: "Rooms and suites",
            items: [
              {
                name: "Panorama Suite",
                description: "Private terrace, king bed, and sea-facing lounge.",
                capacityHint: "2 adults",
                image: getFallbackImage("hotel", 1)
              },
              {
                name: "Harbor Deluxe",
                description: "Generous layout, spa bathroom, and marina views.",
                capacityHint: "2 adults + 1 child",
                image: getFallbackImage("hotel", 2)
              },
              {
                name: "Signature Residence",
                description: "Two-bedroom residence with private dining area.",
                capacityHint: "4 guests",
                image: getFallbackImage("hotel", 0)
              }
            ]
          }
        },
        {
          type: "services",
          id: "amenities",
          content: {
            title: "Amenities",
            items: [
              {
                title: "Rooftop infinity pool",
                description: "Sunset views and private cabana service."
              },
              {
                title: "Wellness spa",
                description: "Tailored treatments, sauna, and steam ritual."
              },
              {
                title: "Gourmet breakfast",
                description: "Curated local ingredients served daily."
              }
            ]
          }
        },
        {
          type: "gallery",
          id: "gallery",
          content: {
            title: "Gallery",
            items: [
              { image: getFallbackImage("hotel", 0), alt: "Hotel exterior with sea view" },
              { image: getFallbackImage("hotel", 1), alt: "Elegant suite interior" },
              { image: getFallbackImage("hotel", 2), alt: "Pool and terrace" }
            ]
          }
        },
        {
          type: "testimonials",
          id: "testimonials",
          content: {
            title: "Guest testimonials",
            items: [
              {
                quote: "A flawless stay. Calm atmosphere, incredible service, and beautiful rooms.",
                author: "Elena M."
              },
              {
                quote: "The perfect weekend retreat with genuine five-star hospitality.",
                author: "Thomas L."
              }
            ]
          }
        },
        {
          type: "faq",
          id: "faq",
          content: {
            title: "Stay information",
            items: [
              {
                question: "Do you offer private airport transfers?",
                answer: "Yes. Our concierge can arrange executive transfers before arrival."
              },
              {
                question: "Is breakfast included?",
                answer: "Breakfast is included in selected packages and available as an add-on."
              }
            ]
          }
        },
        {
          type: "contact",
          id: "contact",
          content: {
            title: "Plan your stay",
            address: "9 Promenade des Flots, 06000 Nice",
            phone: "+33 4 93 00 00 00",
            email: "concierge@harborgrandnice.com",
            hours: ["Concierge: 24/7", "Check-in: 15:00", "Check-out: 12:00"]
          }
        }
      ]
    }
  },
  {
    id: "demo-real-estate-1",
    slug: "northstone-realty-bordeaux",
    status: "generated",
    templateType: "real_estate",
    designStyle: "corporate",
    previewUrl: "/preview/northstone-realty-bordeaux",
    createdAt: now,
    updatedAt: now,
    generatedContent: {
      siteTitle: "Northstone Realty",
      siteSubtitle: "Premium property advisory in Bordeaux",
      category: "real_estate",
      style: "corporate",
      city: "Bordeaux",
      hero: {
        badge: "Trusted Property Advisors",
        title: "Strategic real estate guidance for exceptional homes",
        subtitle:
          "From valuation to closing, our team delivers precise market insight and tailored client service.",
        primaryCta: { label: "Speak with an advisor", href: "#contact" },
        secondaryCta: { label: "Discover our properties", href: "#featured" },
        image: getFallbackImage("real_estate", 0)
      },
      sections: [
        {
          type: "about",
          id: "about",
          content: {
            title: "A partner for every transaction",
            body: "Northstone Realty supports buyers, sellers, and investors with rigorous market analysis and a white-glove service standard.",
            bullets: [
              "Residential and premium portfolio transactions",
              "Investment property advisory",
              "Confidential off-market opportunities"
            ]
          }
        },
        {
          type: "featured_properties",
          id: "featured",
          content: {
            title: "Featured properties",
            subtitle: "Illustrative showcase placeholders for a future live feed",
            items: [
              {
                title: "Jardin Public Residence",
                location: "Bordeaux Center",
                priceHint: "From EUR 1.2M",
                type: "4-bed townhouse",
                image: getFallbackImage("real_estate", 1)
              },
              {
                title: "Rive Droite Villa",
                location: "Cenon",
                priceHint: "From EUR 980K",
                type: "5-bed detached",
                image: getFallbackImage("real_estate", 2)
              },
              {
                title: "Golden Triangle Loft",
                location: "Quinconces",
                priceHint: "From EUR 760K",
                type: "2-bed luxury loft",
                image: getFallbackImage("real_estate", 0)
              }
            ]
          }
        },
        {
          type: "services",
          id: "services",
          content: {
            title: "Our services",
            items: [
              {
                title: "Sales advisory",
                description: "Market positioning, pricing strategy, and premium listing execution."
              },
              {
                title: "Buyer representation",
                description: "Targeted search and negotiation support with local expertise."
              },
              {
                title: "Property valuation",
                description: "Data-driven assessments based on micro-market trends."
              }
            ]
          }
        },
        {
          type: "stats",
          id: "stats",
          content: {
            title: "Why clients trust Northstone",
            items: [
              { label: "Transactions completed", value: "240+" },
              { label: "Average sale timeline", value: "41 days" },
              { label: "Client recommendation rate", value: "96%" }
            ]
          }
        },
        {
          type: "testimonials",
          id: "testimonials",
          content: {
            title: "Client feedback",
            items: [
              {
                quote: "Sharp market insight and a very professional process from start to finish.",
                author: "Helene D."
              },
              {
                quote: "Northstone handled our sale with precision and excellent communication.",
                author: "Julien P."
              }
            ]
          }
        },
        {
          type: "cta",
          id: "cta",
          content: {
            title: "Thinking about your next move?",
            body: "Request a confidential consultation with one of our local advisors.",
            action: { label: "Request a valuation", href: "#contact" }
          }
        },
        {
          type: "contact",
          id: "contact",
          content: {
            title: "Connect with our advisory team",
            address: "6 Cours de l'Intendance, 33000 Bordeaux",
            phone: "+33 5 56 00 00 00",
            email: "advisory@northstonerealty.fr",
            hours: ["Mon-Fri: 09:00-19:00", "Sat: 10:00-16:00", "Sun: By appointment"]
          }
        }
      ]
    }
  }
];

export const SEEDED_DEMO_SITES: DemoSiteRecord[] = SEEDED_DEMO_SITES_RAW.map((site) => ({
  ...site,
  generatedContent: normalizeDemoSiteContent(site.generatedContent)
}));
