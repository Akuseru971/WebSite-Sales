"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { BusinessCategory, DemoSiteStyle } from "@/lib/demo-sites/types";
import type { CommerceLead } from "@/lib/leads/mock-leads";

interface ReferenceSite {
  id: string;
  templateType: BusinessCategory;
  designStyle: DemoSiteStyle;
  previewUrl: string;
  editorUrl: string;
  name: string;
  city: string;
}

interface SiteGenerationPlannerProps {
  leads: CommerceLead[];
  referenceSites: ReferenceSite[];
}

interface SiteOption {
  id: string;
  label: string;
  templateType: BusinessCategory;
  style: DemoSiteStyle;
  description: string;
}

interface PlannedGeneration {
  id: string;
  leadName: string;
  city: string;
  category: BusinessCategory;
  siteOptionLabel: string;
  style: DemoSiteStyle;
  referencePreviewUrl?: string;
  referenceEditorUrl?: string;
}

const categoryLabels: Record<BusinessCategory, string> = {
  taxi: "Taxi",
  restaurant: "Restaurant",
  hotel: "Hotel",
  real_estate: "Immobilier"
};

const siteOptionsByCategory: Record<BusinessCategory, SiteOption[]> = {
  taxi: [
    {
      id: "taxi-urban-conversion",
      label: "One-page Conversion Urbaine",
      templateType: "taxi",
      style: "urban",
      description: "Hero impactant, CTA booking visible, preuve sociale immediate."
    },
    {
      id: "taxi-corporate-executive",
      label: "Executive Transfer Corporate",
      templateType: "taxi",
      style: "corporate",
      description: "Positionnement premium pour clients business et aeroports."
    }
  ],
  restaurant: [
    {
      id: "restaurant-atmospheric-story",
      label: "Storytelling Gastronomique",
      templateType: "restaurant",
      style: "atmospheric",
      description: "Mise en scene culinaire avec sections menu et reservation."
    },
    {
      id: "restaurant-luxury-dining",
      label: "Fine Dining Prestige",
      templateType: "restaurant",
      style: "luxury",
      description: "Direction artistique haut de gamme et experience degustation."
    }
  ],
  hotel: [
    {
      id: "hotel-luxury-stay",
      label: "Sejour Luxe",
      templateType: "hotel",
      style: "luxury",
      description: "Focus chambres, prestations et reservation sejour."
    },
    {
      id: "hotel-modern-city",
      label: "Hotel City Break Moderne",
      templateType: "hotel",
      style: "urban",
      description: "Version orientee conversion mobile et reservation rapide."
    }
  ],
  real_estate: [
    {
      id: "immo-corporate-leads",
      label: "Agence Corporate Lead Gen",
      templateType: "real_estate",
      style: "corporate",
      description: "Mandats et estimation, credibilite locale, formulaires lead."
    },
    {
      id: "immo-premium-showcase",
      label: "Vitrine Premium Proprietes",
      templateType: "real_estate",
      style: "luxury",
      description: "Mise en avant de biens premium avec visuels immersifs."
    }
  ]
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function initialCategoryMap(): Record<BusinessCategory, boolean> {
  return {
    taxi: true,
    restaurant: true,
    hotel: true,
    real_estate: true
  };
}

export function SiteGenerationPlanner({ leads, referenceSites }: SiteGenerationPlannerProps) {
  const [cityQuery, setCityQuery] = useState("");
  const [activeCategories, setActiveCategories] = useState<Record<BusinessCategory, boolean>>(initialCategoryMap);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedSiteOptionIds, setSelectedSiteOptionIds] = useState<string[]>([]);
  const [plannedGenerations, setPlannedGenerations] = useState<PlannedGeneration[]>([]);

  const filteredLeads = useMemo(() => {
    const cityFilter = normalize(cityQuery);

    return leads.filter((lead) => {
      const categoryAllowed = activeCategories[lead.category];
      const cityAllowed =
        !cityFilter || normalize(lead.city).includes(cityFilter) || normalize(lead.businessName).includes(cityFilter);

      return categoryAllowed && cityAllowed;
    });
  }, [activeCategories, cityQuery, leads]);

  const leadsByCategory = useMemo(() => {
    return filteredLeads.reduce<Record<BusinessCategory, CommerceLead[]>>(
      (acc, lead) => {
        acc[lead.category].push(lead);
        return acc;
      },
      {
        taxi: [],
        restaurant: [],
        hotel: [],
        real_estate: []
      }
    );
  }, [filteredLeads]);

  const selectedLead = useMemo(() => {
    if (!selectedLeadId) {
      return null;
    }

    return leads.find((lead) => lead.id === selectedLeadId) ?? null;
  }, [leads, selectedLeadId]);

  const availableSiteOptions = selectedLead ? siteOptionsByCategory[selectedLead.category] : [];

  function toggleCategory(category: BusinessCategory) {
    setActiveCategories((previous) => ({
      ...previous,
      [category]: !previous[category]
    }));
  }

  function toggleSiteOption(optionId: string) {
    setSelectedSiteOptionIds((previous) =>
      previous.includes(optionId) ? previous.filter((id) => id !== optionId) : [...previous, optionId]
    );
  }

  function chooseLead(leadId: string) {
    setSelectedLeadId(leadId);
    setSelectedSiteOptionIds([]);
  }

  function buildGenerationPlan() {
    if (!selectedLead) {
      return;
    }

    const selectedOptions = availableSiteOptions.filter((option) => selectedSiteOptionIds.includes(option.id));
    if (!selectedOptions.length) {
      return;
    }

    const now = Date.now();
    const plans: PlannedGeneration[] = selectedOptions.map((option, index) => {
      const matchingReference =
        referenceSites.find(
          (site) => site.templateType === option.templateType && site.designStyle === option.style
        ) ?? referenceSites.find((site) => site.templateType === option.templateType);

      return {
        id: `${selectedLead.id}-${option.id}-${now}-${index}`,
        leadName: selectedLead.businessName,
        city: selectedLead.city,
        category: selectedLead.category,
        siteOptionLabel: option.label,
        style: option.style,
        referencePreviewUrl: matchingReference?.previewUrl,
        referenceEditorUrl: matchingReference?.editorUrl
      };
    });

    setPlannedGenerations((previous) => [...plans, ...previous]);
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
      <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-soft md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Etape 1</p>
        <h2 className="mt-2 font-[var(--font-heading)] text-4xl text-ink">Ville cible et categories</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <label className="text-sm text-zinc-700">
            Ville ou mot cle
            <input
              type="text"
              value={cityQuery}
              onChange={(event) => setCityQuery(event.target.value)}
              placeholder="Ex: Paris, Nice, Bordeaux"
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2"
            />
          </label>
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-600">
            {filteredLeads.length} commerces matches
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(categoryLabels) as BusinessCategory[]).map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => toggleCategory(category)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                activeCategories[category]
                  ? "border-ink bg-ink text-white"
                  : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
              }`}
            >
              {categoryLabels[category]} ({leadsByCategory[category].length})
            </button>
          ))}
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Etape 2</p>
        <h3 className="mt-2 font-[var(--font-heading)] text-3xl text-ink">Commerces par categorie</h3>

        <div className="mt-4 space-y-4">
          {(Object.keys(categoryLabels) as BusinessCategory[]).map((category) => {
            const categoryLeads = leadsByCategory[category];
            if (!categoryLeads.length) {
              return null;
            }

            return (
              <div key={category} className="rounded-2xl border border-zinc-200 p-3 md:p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  {categoryLabels[category]}
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {categoryLeads.map((lead) => {
                    const isSelected = selectedLeadId === lead.id;

                    return (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => chooseLead(lead.id)}
                        className={`rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? "border-ink bg-zinc-900 text-white"
                            : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-300"
                        }`}
                      >
                        <p className="text-sm font-semibold">{lead.businessName}</p>
                        <p className={`mt-1 text-xs ${isSelected ? "text-zinc-300" : "text-zinc-600"}`}>
                          {lead.city}
                          {lead.district ? ` - ${lead.district}` : ""}
                        </p>
                        {lead.contactName ? (
                          <p className={`mt-2 text-xs ${isSelected ? "text-zinc-200" : "text-zinc-600"}`}>
                            Contact: {lead.contactName}
                          </p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </article>

      <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-soft md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Etape 3</p>
        <h2 className="mt-2 font-[var(--font-heading)] text-4xl text-ink">Sites a generer</h2>

        {selectedLead ? (
          <>
            <p className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              Commerce selectionne: <span className="font-semibold">{selectedLead.businessName}</span>
            </p>

            <div className="mt-4 space-y-3">
              {availableSiteOptions.map((option) => {
                const checked = selectedSiteOptionIds.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className={`block rounded-xl border p-3 transition ${
                      checked ? "border-ink bg-zinc-100" : "border-zinc-200 bg-white"
                    }`}
                  >
                    <span className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSiteOption(option.id)}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-zinc-900">{option.label}</span>
                        <span className="mt-1 block text-xs text-zinc-600">{option.description}</span>
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            <button
              type="button"
              onClick={buildGenerationPlan}
              disabled={!selectedSiteOptionIds.length}
              className="mt-4 w-full rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Ajouter a la file de generation
            </button>
          </>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600">
            Selectionne d&apos;abord un commerce dans la colonne de gauche.
          </p>
        )}

        <div className="mt-6 border-t border-zinc-200 pt-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-600">File de generation</h3>
          <div className="mt-3 space-y-3">
            {plannedGenerations.length ? (
              plannedGenerations.map((plan) => (
                <div key={plan.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-sm font-semibold text-zinc-900">{plan.leadName}</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    {categoryLabels[plan.category]} - {plan.city} - {plan.siteOptionLabel}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.08em] text-zinc-500">Style: {plan.style}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {plan.referencePreviewUrl ? (
                      <Link
                        href={plan.referencePreviewUrl}
                        target="_blank"
                        className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700"
                      >
                        Voir preview de reference
                      </Link>
                    ) : null}
                    {plan.referenceEditorUrl ? (
                      <Link
                        href={plan.referenceEditorUrl}
                        className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Ouvrir editeur
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600">
                Aucune generation planifiee pour l&apos;instant.
              </p>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}
