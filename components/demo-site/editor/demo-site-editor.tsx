"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DemoSection, DemoSiteContent, DemoSiteRecord, DemoSiteVersion } from "@/lib/demo-sites/types";
import { getHeroSection } from "@/lib/demo-sites/content";
import { validateDemoSiteContent, getValidationErrorMessage } from "@/lib/demo-sites/validation";

type EditorTab = "visual" | "json" | "ai" | "versions" | "pipeline";

interface DemoSiteEditorProps {
  site: DemoSiteRecord;
  initialVersions: DemoSiteVersion[];
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getSection<TType extends DemoSection["type"]>(
  content: DemoSiteContent,
  type: TType
): Extract<DemoSection, { type: TType }> | undefined {
  return content.sections.find((section) => section.type === type) as
    | Extract<DemoSection, { type: TType }>
    | undefined;
}

function replaceSection(content: DemoSiteContent, sectionId: string, nextSection: DemoSection): DemoSiteContent {
  return {
    ...content,
    sections: content.sections.map((section) => (section.id === sectionId ? nextSection : section))
  };
}

function contentEquals(a: DemoSiteContent, b: DemoSiteContent): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function DemoSiteEditor({ site, initialVersions }: DemoSiteEditorProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>("visual");
  const [currentContent, setCurrentContent] = useState<DemoSiteContent>(site.generatedContent);
  const [draftContent, setDraftContent] = useState<DemoSiteContent>(deepClone(site.generatedContent));
  const [jsonDraft, setJsonDraft] = useState<string>(JSON.stringify(site.generatedContent, null, 2));
  const [versions, setVersions] = useState<DemoSiteVersion[]>(initialVersions);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createVersionOnSave, setCreateVersionOnSave] = useState(true);
  const [changeNote, setChangeNote] = useState("");
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiSuggestedContent, setAiSuggestedContent] = useState<DemoSiteContent | null>(null);

  const isDirty = useMemo(() => !contentEquals(currentContent, draftContent), [currentContent, draftContent]);

  const pipelineStages = useMemo(
    () =>
      [
        { step: 1, key: "crawl_result", label: "Source website crawl", data: site.crawlResultJson },
        { step: 2, key: "rendered_dom", label: "Rendered DOM extraction", data: site.renderedDomJson },
        { step: 3, key: "reconstructed_source", label: "Semantic source reconstruction", data: site.reconstructedSourceJson },
        { step: 4, key: "raw_content", label: "Raw content extraction", data: site.rawContentJson },
        { step: 5, key: "raw_images", label: "Raw image extraction", data: site.rawImagesJson },
        { step: 6, key: "normalized_content", label: "AI content mapping", data: site.normalizedContentJson },
        { step: 7, key: "selected_images", label: "AI image selection", data: site.selectedImagesJson },
        { step: 8, key: "brand_profile", label: "AI brand analysis", data: site.brandProfileJson },
        { step: 9, key: "source_quality_score", label: "AI source quality scoring", data: site.sourceQualityScoreJson },
        { step: 10, key: "redesign_plan", label: "Adaptive redesign strategy", data: site.redesignPlanStepJson },
        { step: 11, key: "completed_content", label: "Content completion", data: site.completedContentJson },
        { step: 12, key: "translated_content", label: "Translation generation", data: site.translatedContentJson },
        { step: 13, key: "final_render_data", label: "Final premium website generation", data: site.finalRenderDataJson },
        { step: 14, key: "ai_review", label: "AI review", data: site.aiReviewJson },
        { step: 15, key: "correction_pass", label: "AI correction pass", data: site.correctionPassJson },
      ] as const,
    [site],
  );

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  async function refreshVersions() {
    const response = await fetch(`/api/demo-sites/${site.id}/versions`, { method: "GET" });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load version history.");
    }

    setVersions(payload.versions ?? []);
  }

  async function persistContent(nextContent: DemoSiteContent, activityType: string) {
    setIsSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const validated = validateDemoSiteContent(nextContent);
      const response = await fetch(`/api/demo-sites/${site.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: validated,
          createVersion: createVersionOnSave,
          changeNote: changeNote || undefined,
          activityType
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save content.");
      }

      setCurrentContent(payload.site.generatedContent);
      setDraftContent(deepClone(payload.site.generatedContent));
      setJsonDraft(JSON.stringify(payload.site.generatedContent, null, 2));
      setStatusMessage("Changes saved successfully.");
      setChangeNote("");
      await refreshVersions();
    } catch (error) {
      setErrorMessage(getValidationErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  function updateBusinessField(field: keyof DemoSiteContent["businessInfo"], value: string) {
    setDraftContent((previous) => ({
      ...previous,
      businessInfo: {
        ...previous.businessInfo,
        [field]: value
      }
    }));
  }

  function updateThemeField(field: keyof DemoSiteContent["theme"], value: string) {
    setDraftContent((previous) => ({
      ...previous,
      theme: {
        ...previous.theme,
        [field]: value
      }
    }));
  }

  function updateSeoField(field: keyof DemoSiteContent["seo"], value: string) {
    setDraftContent((previous) => ({
      ...previous,
      seo: {
        ...previous.seo,
        [field]: value
      }
    }));
  }

  function updateContactField(field: keyof DemoSiteContent["contact"], value: string | boolean) {
    setDraftContent((previous) => ({
      ...previous,
      contact: {
        ...previous.contact,
        [field]: value
      }
    }));
  }

  function updateHeroField(field: "title" | "subtitle" | "primaryLabel", value: string) {
    setDraftContent((previous) => {
      const heroSection = previous.sections.find((section) => section.type === "hero");
      if (!heroSection) {
        return previous;
      }

      const heroContent = heroSection.content as ReturnType<typeof getHeroSection>;
      const nextHero: DemoSection = {
        ...heroSection,
        content:
          field === "primaryLabel"
            ? {
                ...heroContent,
                primaryCta: {
                  ...heroContent.primaryCta,
                  label: value
                }
              }
            : {
                ...heroContent,
                [field]: value
              }
      };

      return replaceSection(previous, heroSection.id, nextHero);
    });
  }

  function updateSectionSettings(sectionId: string, field: "enabled" | "order", value: boolean | number) {
    setDraftContent((previous) => ({
      ...previous,
      sections: previous.sections.map((section) =>
        section.id === sectionId ? { ...section, [field]: value } : section
      )
    }));
  }

  function updateTestimonials(raw: string) {
    setDraftContent((previous) => {
      const section = getSection(previous, "testimonials");
      if (!section) {
        return previous;
      }

      const rows = raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [author, quote] = line.split("|").map((part) => part.trim());
          return {
            author: author || "Guest",
            quote: quote || ""
          };
        });

      const nextSection: Extract<DemoSection, { type: "testimonials" }> = {
        ...section,
        content: {
          ...section.content,
          items: rows
        }
      };

      return replaceSection(previous, section.id, nextSection);
    });
  }

  function updateGallery(raw: string) {
    setDraftContent((previous) => {
      const section = getSection(previous, "gallery");
      if (!section) {
        return previous;
      }

      const rows = raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => ({
          image: line,
          alt: `Gallery image ${index + 1}`
        }));

      const nextSection: Extract<DemoSection, { type: "gallery" }> = {
        ...section,
        content: {
          ...section.content,
          items: rows
        }
      };

      return replaceSection(previous, section.id, nextSection);
    });
  }

  async function handleSaveVisual() {
    await persistContent(draftContent, "demo_site_visual_edit_saved");
  }

  async function handleSaveJson() {
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const parsed = JSON.parse(jsonDraft);
      const validated = validateDemoSiteContent(parsed);
      await persistContent(validated, "demo_site_json_updated");
    } catch (error) {
      setErrorMessage(getValidationErrorMessage(error));
    }
  }

  async function handleGenerateAiSuggestion() {
    setIsGeneratingAi(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/demo-sites/${site.id}/ai-edit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ instruction: aiInstruction })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to generate AI suggestion.");
      }

      setAiSuggestedContent(payload.suggestedContent);
      setStatusMessage("AI suggestion generated. Review before saving.");
    } catch (error) {
      setErrorMessage(getValidationErrorMessage(error));
    } finally {
      setIsGeneratingAi(false);
    }
  }

  async function handleApproveAiSuggestion() {
    if (!aiSuggestedContent) {
      return;
    }

    await persistContent(aiSuggestedContent, "demo_site_ai_edit_approved");
    setAiSuggestedContent(null);
    setAiInstruction("");
  }

  async function handleRestoreVersion(versionId: string, versionNumber: number) {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/demo-sites/${site.id}/versions/restore`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          versionId,
          changeNote: `Restored from version #${versionNumber}`
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to restore version.");
      }

      setCurrentContent(payload.site.generatedContent);
      setDraftContent(deepClone(payload.site.generatedContent));
      setJsonDraft(JSON.stringify(payload.site.generatedContent, null, 2));
      await refreshVersions();
      setStatusMessage(`Version #${versionNumber} restored successfully.`);
    } catch (error) {
      setErrorMessage(getValidationErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const hero = getHeroSection(draftContent);
  const testimonialsSection = getSection(draftContent, "testimonials");
  const gallerySection = getSection(draftContent, "gallery");

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Demo Site Editor</p>
            <h1 className="font-[var(--font-heading)] text-4xl leading-tight text-ink">{draftContent.businessInfo.name}</h1>
            <p className="text-sm text-zinc-600">Single source of truth: `generated_content_json`</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/sites/${site.slug}`}
              target="_blank"
              className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800"
            >
              Voir le site genere
            </Link>
          </div>
        </div>

        {statusMessage ? <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{statusMessage}</p> : null}
        {errorMessage ? <p className="mb-3 whitespace-pre-wrap rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{errorMessage}</p> : null}

        <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-soft">
          {([
            ["visual", "Visual Edit"],
            ["json", "JSON Edit"],
            ["ai", "AI Edit"],
            ["pipeline", "Pipeline Debug"],
            ["versions", "Version History"]
          ] as Array<[EditorTab, string]>).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === id ? "bg-ink text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "visual" ? (
          <section className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-soft">
                <h2 className="font-[var(--font-heading)] text-3xl">Business Info</h2>
                <div className="mt-4 grid gap-3">
                  <label className="text-sm">Business Name<input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" value={draftContent.businessInfo.name} onChange={(event) => updateBusinessField("name", event.target.value)} /></label>
                  <label className="text-sm">Tagline<input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" value={draftContent.businessInfo.tagline ?? ""} onChange={(event) => updateBusinessField("tagline", event.target.value)} /></label>
                  <label className="text-sm">Description<textarea className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" rows={4} value={draftContent.businessInfo.shortDescription ?? ""} onChange={(event) => updateBusinessField("shortDescription", event.target.value)} /></label>
                  <label className="text-sm">Phone<input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" value={draftContent.businessInfo.phone ?? ""} onChange={(event) => updateBusinessField("phone", event.target.value)} /></label>
                  <label className="text-sm">Email<input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" value={draftContent.businessInfo.email ?? ""} onChange={(event) => updateBusinessField("email", event.target.value)} /></label>
                  <label className="text-sm">WhatsApp<input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" value={draftContent.businessInfo.whatsapp ?? ""} onChange={(event) => updateBusinessField("whatsapp", event.target.value)} /></label>
                </div>
              </article>

              <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-soft">
                <h2 className="font-[var(--font-heading)] text-3xl">Hero</h2>
                <div className="mt-4 grid gap-3">
                  <label className="text-sm">Hero Title<input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" value={hero.title} onChange={(event) => updateHeroField("title", event.target.value)} /></label>
                  <label className="text-sm">Hero Subtitle<textarea className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" rows={4} value={hero.subtitle} onChange={(event) => updateHeroField("subtitle", event.target.value)} /></label>
                  <label className="text-sm">Primary CTA Text<input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" value={hero.primaryCta.label} onChange={(event) => updateHeroField("primaryLabel", event.target.value)} /></label>
                </div>
              </article>

              <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-soft">
                <h2 className="font-[var(--font-heading)] text-3xl">Theme</h2>
                <div className="mt-4 grid gap-3">
                  <label className="text-sm">Primary Color<input type="color" className="mt-1 h-10 w-16 rounded border border-zinc-300" value={draftContent.theme.primaryColor} onChange={(event) => updateThemeField("primaryColor", event.target.value)} /></label>
                  <label className="text-sm">Secondary Color<input type="color" className="mt-1 h-10 w-16 rounded border border-zinc-300" value={draftContent.theme.secondaryColor} onChange={(event) => updateThemeField("secondaryColor", event.target.value)} /></label>
                  <label className="text-sm">Accent Color<input type="color" className="mt-1 h-10 w-16 rounded border border-zinc-300" value={draftContent.theme.accentColor} onChange={(event) => updateThemeField("accentColor", event.target.value)} /></label>
                </div>
              </article>

              <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-soft">
                <h2 className="font-[var(--font-heading)] text-3xl">SEO & Contact</h2>
                <div className="mt-4 grid gap-3">
                  <label className="text-sm">Meta Title<input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" value={draftContent.seo.metaTitle} onChange={(event) => updateSeoField("metaTitle", event.target.value)} /></label>
                  <label className="text-sm">Meta Description<textarea className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" rows={3} value={draftContent.seo.metaDescription} onChange={(event) => updateSeoField("metaDescription", event.target.value)} /></label>
                  <label className="text-sm">Contact Email<input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" value={draftContent.contact.email ?? ""} onChange={(event) => updateContactField("email", event.target.value)} /></label>
                  <label className="text-sm">Contact Phone<input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" value={draftContent.contact.phone ?? ""} onChange={(event) => updateContactField("phone", event.target.value)} /></label>
                  <label className="text-sm">WhatsApp<input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" value={draftContent.contact.whatsapp ?? ""} onChange={(event) => updateContactField("whatsapp", event.target.value)} /></label>
                </div>
              </article>
            </div>

            <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-soft">
              <h2 className="font-[var(--font-heading)] text-3xl">Sections</h2>
              <div className="mt-4 space-y-3">
                {[...draftContent.sections]
                  .sort((a, b) => a.order - b.order)
                  .map((section) => (
                    <div key={section.id} className="grid gap-3 rounded-xl border border-zinc-200 p-3 md:grid-cols-[1fr_auto_auto] md:items-center">
                      <div>
                        <p className="text-sm font-semibold text-zinc-800">{section.type}</p>
                        <p className="text-xs text-zinc-500">id: {section.id}</p>
                      </div>
                      <label className="text-sm">Order<input type="number" className="ml-2 w-20 rounded border border-zinc-300 px-2 py-1" value={section.order} onChange={(event) => updateSectionSettings(section.id, "order", Number(event.target.value))} /></label>
                      <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={section.enabled} onChange={(event) => updateSectionSettings(section.id, "enabled", event.target.checked)} /> Enabled</label>
                    </div>
                  ))}
              </div>
            </article>

            <div className="grid gap-6 lg:grid-cols-2">
              <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-soft">
                <h2 className="font-[var(--font-heading)] text-3xl">Testimonials</h2>
                <p className="mt-1 text-xs text-zinc-500">Format: `Author | Quote` one per line.</p>
                <textarea
                  className="mt-3 min-h-56 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
                  value={
                    testimonialsSection
                      ? ((testimonialsSection.content as { items?: Array<{ author: string; quote: string }> }).items ?? [])
                          .map((item) => `${item.author} | ${item.quote}`)
                          .join("\n")
                      : ""
                  }
                  onChange={(event) => updateTestimonials(event.target.value)}
                />
              </article>

              <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-soft">
                <h2 className="font-[var(--font-heading)] text-3xl">Gallery URLs</h2>
                <p className="mt-1 text-xs text-zinc-500">One image URL per line.</p>
                <textarea
                  className="mt-3 min-h-56 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
                  value={
                    gallerySection
                      ? ((gallerySection.content as { items?: Array<{ image: string }> }).items ?? [])
                          .map((item) => item.image)
                          .join("\n")
                      : ""
                  }
                  onChange={(event) => updateGallery(event.target.value)}
                />
              </article>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-soft">
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={createVersionOnSave} onChange={(event) => setCreateVersionOnSave(event.target.checked)} /> Create new version</label>
              <input
                placeholder="Change note (optional)"
                className="min-w-[260px] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                value={changeNote}
                onChange={(event) => setChangeNote(event.target.value)}
              />
              <button type="button" onClick={handleSaveVisual} disabled={isSaving} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {isSaving ? "Saving..." : "Save Visual Changes"}
              </button>
            </div>
          </section>
        ) : null}

        {activeTab === "json" ? (
          <section className="space-y-4">
            <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-soft">
              <h2 className="font-[var(--font-heading)] text-3xl">Raw JSON Editor</h2>
              <p className="mt-2 text-sm text-zinc-600">Edit the full `generated_content_json`. Validation runs before save.</p>
              <textarea
                className="mt-4 min-h-[28rem] w-full rounded-xl border border-zinc-300 px-3 py-3 font-mono text-xs leading-relaxed"
                value={jsonDraft}
                onChange={(event) => setJsonDraft(event.target.value)}
              />
            </article>
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-soft">
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={createVersionOnSave} onChange={(event) => setCreateVersionOnSave(event.target.checked)} /> Create new version</label>
              <input
                placeholder="Change note (optional)"
                className="min-w-[260px] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                value={changeNote}
                onChange={(event) => setChangeNote(event.target.value)}
              />
              <button
                type="button"
                onClick={() => {
                  try {
                    const parsed = JSON.parse(jsonDraft);
                    validateDemoSiteContent(parsed);
                    setStatusMessage("JSON is valid.");
                    setErrorMessage(null);
                  } catch (error) {
                    setErrorMessage(getValidationErrorMessage(error));
                  }
                }}
                className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold"
              >
                Validate JSON
              </button>
              <button type="button" onClick={handleSaveJson} disabled={isSaving} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {isSaving ? "Saving..." : "Save JSON"}
              </button>
            </div>
          </section>
        ) : null}

        {activeTab === "ai" ? (
          <section className="space-y-4">
            <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-soft">
              <h2 className="font-[var(--font-heading)] text-3xl">AI Edit</h2>
              <p className="mt-2 text-sm text-zinc-600">Provide a natural-language instruction. AI output is validated and never auto-saved.</p>
              <textarea
                className="mt-4 min-h-32 w-full rounded-xl border border-zinc-300 px-3 py-3 text-sm"
                placeholder="Example: rewrite hero with a more luxurious tone and disable testimonials section"
                value={aiInstruction}
                onChange={(event) => setAiInstruction(event.target.value)}
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={handleGenerateAiSuggestion} disabled={isGeneratingAi} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                  {isGeneratingAi ? "Generating..." : "Generate Suggestion"}
                </button>
                {aiSuggestedContent ? (
                  <button type="button" onClick={handleApproveAiSuggestion} disabled={isSaving} className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                    {isSaving ? "Saving..." : "Approve and Save"}
                  </button>
                ) : null}
              </div>
            </article>

            {aiSuggestedContent ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-soft">
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-600">Current JSON</h3>
                  <pre className="max-h-[30rem] overflow-auto rounded-xl bg-zinc-950 p-3 text-xs text-zinc-100">{JSON.stringify(currentContent, null, 2)}</pre>
                </article>
                <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-soft">
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-600">Suggested JSON</h3>
                  <pre className="max-h-[30rem] overflow-auto rounded-xl bg-zinc-950 p-3 text-xs text-zinc-100">{JSON.stringify(aiSuggestedContent, null, 2)}</pre>
                </article>
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "versions" ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-soft">
            <h2 className="font-[var(--font-heading)] text-3xl">Version History</h2>
            <p className="mt-1 text-sm text-zinc-600">Restoring a version creates a new version entry and preserves full history.</p>
            <div className="mt-4 space-y-3">
              {versions.length ? (
                versions.map((version) => (
                  <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 p-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-800">Version #{version.versionNumber}</p>
                      <p className="text-xs text-zinc-500">{new Date(version.createdAt).toLocaleString()}</p>
                      {version.changeNote ? <p className="text-xs text-zinc-600">{version.changeNote}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold"
                        onClick={() => setJsonDraft(JSON.stringify(version.contentJson, null, 2))}
                      >
                        View JSON
                      </button>
                      <button
                        type="button"
                        className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white"
                        onClick={() => handleRestoreVersion(version.id, version.versionNumber)}
                        disabled={isSaving}
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600">No versions found yet.</p>
              )}
            </div>
          </section>
        ) : null}

        {activeTab === "pipeline" ? (
          <section className="space-y-4">
            <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-soft">
              <h2 className="font-[var(--font-heading)] text-3xl">Sequential Pipeline Inspector</h2>
              <p className="mt-1 text-sm text-zinc-600">Every stage output is stored and inspectable. Use this view to identify where quality drops.</p>
            </article>

            <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-soft">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-600">Pipeline Run Log</h3>
              <pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-zinc-950 p-3 text-xs text-zinc-100">
                {JSON.stringify(site.pipelineRunJson ?? { status: "no pipeline metadata" }, null, 2)}
              </pre>
            </article>

            {pipelineStages.map((stage) => (
              <article key={stage.key} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-soft">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-zinc-900">Step {stage.step}: {stage.label}</h3>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stage.data ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {stage.data ? "stored" : "missing"}
                  </span>
                </div>
                <pre className="max-h-96 overflow-auto rounded-xl bg-zinc-950 p-3 text-xs text-zinc-100">
                  {JSON.stringify(stage.data ?? { message: "No data persisted for this step." }, null, 2)}
                </pre>
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}
