"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { BusinessCategory, DemoSiteStyle } from "@/lib/demo-sites/types";
import type { CommerceLead } from "@/lib/leads/types";

interface PlannedGeneration {
  id: string;
  lead: CommerceLead;
  leadName: string;
  city: string;
  category: BusinessCategory;
  siteOptionLabel: string;
  templateType: BusinessCategory;
  style: DemoSiteStyle;
  status: "queued" | "generating" | "generated" | "failed";
  errorMessage?: string;
  createdSiteId?: string;
  createdSiteUrl?: string;
  createdSiteEditorUrl?: string;
  generatedLanguage?: string;
  outreachEmailSubject?: string;
  outreachEmailBody?: string;
  optimizationStatus?: "idle" | "running" | "audited" | "applied" | "failed";
  optimizationScore?: number;
  optimizationError?: string;
}

const categoryLabels: Record<BusinessCategory, string> = {
  taxi: "Taxi",
  restaurant: "Restaurant",
  hotel: "Hotel",
  real_estate: "Immobilier"
};

const categoryDefaultStyle: Record<BusinessCategory, DemoSiteStyle> = {
  taxi: "urban",
  restaurant: "atmospheric",
  hotel: "luxury",
  real_estate: "corporate"
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

function getLeadWebsiteUrl(website?: string): string | null {
  if (!website) {
    return null;
  }

  const trimmed = website.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

async function readApiPayload(response: Response): Promise<Record<string, unknown>> {
  const raw = await response.text();
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { error: raw };
  }
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

async function searchLeads(params: {
  city: string;
  categories: BusinessCategory[];
}): Promise<CommerceLead[]> {
  const response = await fetch("/api/leads/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      city: params.city,
      categories: params.categories,
      limitPerCategory: 30
    })
  });

  const payload = await readApiPayload(response);
  if (!response.ok) {
    const message =
      typeof payload.error === "string" && payload.error.trim()
        ? payload.error
        : "Recherche impossible.";
    throw new Error(message);
  }

  return Array.isArray(payload.leads) ? (payload.leads as CommerceLead[]) : [];
}

export function SiteGenerationPlanner() {
  const [cityQuery, setCityQuery] = useState("");
  const [activeCategories, setActiveCategories] = useState<Record<BusinessCategory, boolean>>(initialCategoryMap);
  const [fetchedLeads, setFetchedLeads] = useState<CommerceLead[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [plannedGenerations, setPlannedGenerations] = useState<PlannedGeneration[]>([]);

  const hasQueuedItems = plannedGenerations.some((item) => item.status === "queued" || item.status === "failed");

  const filteredLeads = useMemo(() => {
    const cityFilter = normalize(cityQuery);

    return fetchedLeads.filter((lead) => {
      const categoryAllowed = activeCategories[lead.category];
      const cityAllowed =
        !cityFilter || normalize(lead.city).includes(cityFilter) || normalize(lead.businessName).includes(cityFilter);

      return categoryAllowed && cityAllowed;
    });
  }, [activeCategories, cityQuery, fetchedLeads]);

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

    return fetchedLeads.find((lead) => lead.id === selectedLeadId) ?? null;
  }, [fetchedLeads, selectedLeadId]);

  const selectedLeadWebsiteUrl = selectedLead ? getLeadWebsiteUrl(selectedLead.website) : null;

  function toggleCategory(category: BusinessCategory) {
    setActiveCategories((previous) => ({
      ...previous,
      [category]: !previous[category]
    }));
  }

  function chooseLead(leadId: string) {
    setSelectedLeadId(leadId);
  }

  async function handleSearch() {
    const normalizedCity = cityQuery.trim();
    if (!normalizedCity) {
      setSearchError("Indique une ville avant de lancer la recherche.");
      return;
    }

    const categories = (Object.keys(activeCategories) as BusinessCategory[]).filter(
      (category) => activeCategories[category]
    );

    if (!categories.length) {
      setSearchError("Selectionne au moins une categorie.");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);

    try {
      const leads = await searchLeads({ city: normalizedCity, categories });
      setFetchedLeads(leads);
      setSelectedLeadId(null);
    } catch (error) {
      setFetchedLeads([]);
      setSearchError(error instanceof Error ? error.message : "Erreur de recherche.");
    } finally {
      setIsSearching(false);
    }
  }

  function buildGenerationPlan() {
    if (!selectedLead) {
      return;
    }

    const now = Date.now();
    const plans: PlannedGeneration[] = [
      {
        id: `${selectedLead.id}-adaptive-${now}`,
        lead: selectedLead,
        leadName: selectedLead.businessName,
        city: selectedLead.city,
        category: selectedLead.category,
        siteOptionLabel: "Adaptive Redesign",
        templateType: selectedLead.category,
        style: categoryDefaultStyle[selectedLead.category],
        status: "queued"
      }
    ];

    setPlannedGenerations((previous) => [...plans, ...previous]);
  }

  async function generatePlannedSite(planId: string) {
    const plan = plannedGenerations.find((item) => item.id === planId);
    if (!plan) {
      return;
    }

    setPlannedGenerations((previous) =>
      previous.map((item) =>
        item.id === planId
          ? { ...item, status: "generating", errorMessage: undefined }
          : item
      )
    );

    try {
      const response = await fetch("/api/demo-sites/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          lead: plan.lead,
          siteOption: {
            label: plan.siteOptionLabel,
            templateType: plan.templateType,
            style: plan.style
          }
        })
      });

      const payload = await readApiPayload(response);
      if (!response.ok) {
        const message =
          typeof payload.error === "string" && payload.error.trim()
            ? payload.error
            : "Generation API failed.";
        throw new Error(message);
      }

      const job = asObject(payload.job);
      const jobId = typeof job?.id === "string" ? job.id : undefined;
      if (!jobId) {
        throw new Error("Generation job id missing.");
      }

      let finalJob: Record<string, unknown> | undefined;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const advanceResponse = await fetch(`/api/demo-sites/generate/${jobId}/advance`, {
          method: "POST",
        });

        const advancePayload = await readApiPayload(advanceResponse);
        const advancedJob = asObject(advancePayload.job);
        finalJob = advancedJob;

        const status = typeof advancedJob?.status === "string" ? advancedJob.status : "";
        if (status === "completed") {
          break;
        }

        if (status === "failed") {
          const err = typeof advancedJob?.errorMessage === "string"
            ? advancedJob.errorMessage
            : (typeof advancePayload.error === "string" ? advancePayload.error : "Generation failed.");
          throw new Error(err);
        }
      }

      const result = asObject(finalJob?.result);
      const payloadSite = asObject(result?.site);
      const payloadLocale = asObject(result?.locale);
      const payloadOutreach = asObject(result?.outreachEmail);

      const siteId = typeof payloadSite?.id === "string" ? payloadSite.id : undefined;
      const siteUrl = typeof payloadSite?.previewUrl === "string" ? payloadSite.previewUrl : undefined;
      const localeLanguage = typeof payloadLocale?.language === "string" ? payloadLocale.language : undefined;
      const outreachEmailSubject = typeof payloadOutreach?.subject === "string" ? payloadOutreach.subject : undefined;
      const outreachEmailBody = typeof payloadOutreach?.body === "string" ? payloadOutreach.body : undefined;

      if (!siteId || !siteUrl) {
        throw new Error("Generation did not complete in time. Re-run the same lead to continue.");
      }

      setPlannedGenerations((previous) =>
        previous.map((item) =>
          item.id === planId
            ? {
                ...item,
                status: "generated",
                createdSiteId: siteId,
                createdSiteUrl: siteUrl,
                createdSiteEditorUrl: siteId ? `/dashboard/demos/${siteId}/editor` : undefined,
                generatedLanguage: localeLanguage,
                outreachEmailSubject,
                outreachEmailBody,
                optimizationStatus: "idle",
                optimizationError: undefined
              }
            : item
        )
      );
    } catch (error) {
      setPlannedGenerations((previous) =>
        previous.map((item) =>
          item.id === planId
            ? {
                ...item,
                status: "failed",
                errorMessage: error instanceof Error ? error.message : "Generation failed"
              }
            : item
        )
      );
    }
  }

  async function generateAllQueuedSites() {
    const queueIds = plannedGenerations
      .filter((item) => item.status === "queued" || item.status === "failed")
      .map((item) => item.id);

    for (const id of queueIds) {
      // Sequential generation keeps provider/API pressure controlled.
      // eslint-disable-next-line no-await-in-loop
      await generatePlannedSite(id);
    }
  }

  async function runUpgradeForPlan(planId: string) {
    const plan = plannedGenerations.find((item) => item.id === planId);
    if (!plan?.createdSiteId) {
      return;
    }

    setPlannedGenerations((previous) =>
      previous.map((item) =>
        item.id === planId
          ? {
              ...item,
              optimizationStatus: "running",
              optimizationError: undefined,
            }
          : item,
      ),
    );

    try {
      const auditResponse = await fetch(`/api/demo-sites/${plan.createdSiteId}/optimization`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "run_audit" }),
      });

      const auditPayload = await readApiPayload(auditResponse);
      if (!auditResponse.ok) {
        const message = typeof auditPayload.error === "string" ? auditPayload.error : "Optimization audit failed.";
        throw new Error(message);
      }

      const auditData = asObject(auditPayload.optimization);
      const report = asObject(auditData?.report);
      const score = asNumber(report?.overallScore);

      setPlannedGenerations((previous) =>
        previous.map((item) =>
          item.id === planId
            ? {
                ...item,
                optimizationStatus: "audited",
                optimizationScore: score ?? item.optimizationScore,
              }
            : item,
        ),
      );

      const applyResponse = await fetch(`/api/demo-sites/${plan.createdSiteId}/optimization`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "apply_fixes" }),
      });

      const applyPayload = await readApiPayload(applyResponse);
      if (!applyResponse.ok) {
        const message = typeof applyPayload.error === "string" ? applyPayload.error : "Optimization apply failed.";
        throw new Error(message);
      }

      const applyData = asObject(applyPayload.optimization);
      const applyReport = asObject(applyData?.report);
      const applyScore = asNumber(applyReport?.overallScore);

      setPlannedGenerations((previous) =>
        previous.map((item) =>
          item.id === planId
            ? {
                ...item,
                optimizationStatus: "applied",
                optimizationScore: applyScore ?? item.optimizationScore,
                optimizationError: undefined,
              }
            : item,
        ),
      );
    } catch (error) {
      setPlannedGenerations((previous) =>
        previous.map((item) =>
          item.id === planId
            ? {
                ...item,
                optimizationStatus: "failed",
                optimizationError: error instanceof Error ? error.message : "Optimization failed.",
              }
            : item,
        ),
      );
    }
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
          <div className="flex items-center gap-2">
            <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-600">
              {filteredLeads.length} commerces matches
            </p>
            <button
              type="button"
              onClick={handleSearch}
              disabled={isSearching}
              className="rounded-full bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-60"
            >
              {isSearching ? "Recherche..." : "Rechercher"}
            </button>
          </div>
        </div>

        {searchError ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{searchError}</p>
        ) : null}

        <p className="mt-3 text-xs text-zinc-500">Source live: OpenStreetMap (Nominatim + Overpass API)</p>

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
          {hasSearched && !filteredLeads.length && !isSearching && !searchError ? (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600">
              Aucun commerce trouve pour cette recherche. Essaie une autre ville ou active plus de categories.
            </p>
          ) : null}

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
                    const websiteUrl = getLeadWebsiteUrl(lead.website);

                    return (
                      <div
                        key={lead.id}
                        className={`rounded-xl border p-3 transition ${
                          isSelected
                            ? "border-ink bg-zinc-900 text-white"
                            : "border-zinc-200 bg-zinc-50 text-zinc-800"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => chooseLead(lead.id)}
                          className="w-full text-left"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold">{lead.businessName}</p>
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                                websiteUrl
                                  ? isSelected
                                    ? "bg-emerald-500/20 text-emerald-200"
                                    : "bg-emerald-100 text-emerald-700"
                                  : isSelected
                                    ? "bg-zinc-700 text-zinc-200"
                                    : "bg-zinc-200 text-zinc-700"
                              }`}
                            >
                              {websiteUrl ? "Site disponible" : "Pas de site detecte"}
                            </span>
                          </div>
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

                        {websiteUrl ? (
                          <Link
                            href={websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`mt-3 inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${
                              isSelected
                                ? "border-zinc-500 bg-zinc-800 text-zinc-100"
                                : "border-zinc-300 bg-white text-zinc-700"
                            }`}
                          >
                            Ouvrir le site
                          </Link>
                        ) : null}
                      </div>
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
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${
                  selectedLead.website
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-zinc-200 text-zinc-700"
                }`}
              >
                {selectedLead.website ? "Site disponible" : "Pas de site detecte"}
              </span>
              {selectedLeadWebsiteUrl ? (
                <Link
                  href={selectedLeadWebsiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-700"
                >
                  Ouvrir le site du commerce
                </Link>
              ) : null}
            </div>

            <p className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              Mode: <span className="font-semibold">Adaptive Redesign</span> (analyse du site existant, preservation identitaire, redesign premium)
            </p>

            <button
              type="button"
              onClick={buildGenerationPlan}
              className="mt-4 w-full rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white"
            >
              Ajouter le redesign adaptatif a la file
            </button>
          </>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600">
            Selectionne d&apos;abord un commerce dans la colonne de gauche.
          </p>
        )}

        <div className="mt-6 border-t border-zinc-200 pt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-600">File de generation</h3>
            <button
              type="button"
              onClick={generateAllQueuedSites}
              disabled={!hasQueuedItems}
              className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              Generer toute la file
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {plannedGenerations.length ? (
              plannedGenerations.map((plan) => (
                <div key={plan.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-sm font-semibold text-zinc-900">{plan.leadName}</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    {categoryLabels[plan.category]} - {plan.city} - {plan.siteOptionLabel}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.08em] text-zinc-500">Style: {plan.style}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.08em] text-zinc-500">
                    Statut: {plan.status}
                  </p>
                  {plan.generatedLanguage ? (
                    <p className="mt-1 text-xs uppercase tracking-[0.08em] text-zinc-500">
                      Langue generee: {plan.generatedLanguage}
                    </p>
                  ) : null}
                  {plan.errorMessage ? (
                    <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
                      {plan.errorMessage}
                    </p>
                  ) : null}
                  {plan.optimizationStatus ? (
                    <p className="mt-1 text-xs uppercase tracking-[0.08em] text-zinc-500">
                      Upgrade: {plan.optimizationStatus}
                      {typeof plan.optimizationScore === "number" ? ` (score ${Math.round(plan.optimizationScore)})` : ""}
                    </p>
                  ) : null}
                  {plan.optimizationError ? (
                    <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">
                      {plan.optimizationError}
                    </p>
                  ) : null}
                  {plan.outreachEmailSubject ? (
                    <div className="mt-2 rounded-lg border border-zinc-200 bg-white px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        Mail d&apos;envoi (adapte pays/langue)
                      </p>
                      <p className="mt-1 text-xs text-zinc-700">
                        <span className="font-semibold">Objet:</span> {plan.outreachEmailSubject}
                      </p>
                      {plan.outreachEmailBody ? (
                        <pre className="mt-2 whitespace-pre-wrap rounded bg-zinc-50 p-2 text-[11px] text-zinc-700">
                          {plan.outreachEmailBody}
                        </pre>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {plan.status !== "generated" ? (
                      <button
                        type="button"
                        className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        disabled={plan.status === "generating"}
                        onClick={() => generatePlannedSite(plan.id)}
                      >
                        {plan.status === "generating" ? "Generation..." : "Generer ce site"}
                      </button>
                    ) : null}
                    {plan.createdSiteUrl ? (
                      <Link
                        href={plan.createdSiteUrl}
                        target="_blank"
                        className="rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700"
                      >
                        Voir le site genere
                      </Link>
                    ) : null}
                    {plan.createdSiteEditorUrl ? (
                      <Link
                        href={plan.createdSiteEditorUrl}
                        className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Ouvrir editeur du site genere
                      </Link>
                    ) : null}
                    {plan.createdSiteId ? (
                      <button
                        type="button"
                        className="rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        disabled={plan.optimizationStatus === "running"}
                        onClick={() => runUpgradeForPlan(plan.id)}
                      >
                        {plan.optimizationStatus === "running" ? "Upgrade en cours..." : "Upgrade (amelioration)"}
                      </button>
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
