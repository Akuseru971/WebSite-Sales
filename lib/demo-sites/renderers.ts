import type { BusinessCategory } from "./types";

export const categoryLabel: Record<BusinessCategory, string> = {
  taxi: "Taxi",
  restaurant: "Restaurant",
  hotel: "Hotel",
  real_estate: "Real Estate"
};

export const categoryAccent: Record<BusinessCategory, string> = {
  taxi: "from-slate-900 via-zinc-900 to-neutral-900",
  restaurant: "from-stone-950 via-amber-950 to-zinc-900",
  hotel: "from-cyan-950 via-slate-900 to-zinc-950",
  real_estate: "from-zinc-950 via-stone-900 to-slate-900"
};
