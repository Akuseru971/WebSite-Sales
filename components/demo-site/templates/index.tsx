import type { DemoSiteRecord } from "@/lib/demo-sites/types";
import { AdaptiveTemplate } from "@/components/demo-site/templates/adaptive-template";
import { renderGeneratedHtmlPreview } from "@/components/demo-site/templates/generated-html-preview";

interface DemoTemplateRendererProps {
  site: DemoSiteRecord;
}

export function DemoTemplateRenderer({ site }: DemoTemplateRendererProps) {
  const hasSourceWebsite = Boolean(site.generatedContent.sourceReconstructedHtml);
  const htmlPreview = site.generatedContent.generatedHtmlPreview;

  if (hasSourceWebsite && htmlPreview?.html) {
    return renderGeneratedHtmlPreview(htmlPreview);
  }

  if (hasSourceWebsite) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-20">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900 shadow-sm">
          <h1 className="text-lg font-semibold">Source-aware HTML preview missing</h1>
          <p className="mt-2 text-sm">
            This site was generated from a real source website and must be rendered from final AI HTML output.
            Please regenerate this demo to produce the source-aware HTML preview document.
          </p>
        </div>
      </main>
    );
  }

  return <AdaptiveTemplate site={site} />;
}
