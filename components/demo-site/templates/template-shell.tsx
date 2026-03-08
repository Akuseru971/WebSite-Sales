import { cn } from "@/lib/utils";
import type { DemoSiteRecord } from "@/lib/demo-sites/types";

interface TemplateShellProps {
  site: DemoSiteRecord;
  className?: string;
  children: React.ReactNode;
}

export function TemplateShell({ site, className, children }: TemplateShellProps) {
  return (
    <main className={cn("relative min-h-screen overflow-hidden", className)}>
      <div className="pointer-events-none absolute left-0 top-0 h-[38rem] w-full bg-mesh-soft opacity-80" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 grain-overlay opacity-20" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-sand/85" aria-hidden="true" />
      <div className="relative z-10">
        <header className="mx-auto mt-4 flex w-full max-w-6xl items-center justify-between rounded-2xl border border-white/80 bg-white/70 px-4 py-3 shadow-soft backdrop-blur sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Demo Concept</p>
            <p className="truncate font-[var(--font-heading)] text-2xl leading-tight text-ink">{site.generatedContent.businessInfo.name}</p>
          </div>
          <span className="ml-4 rounded-full border border-zinc-300/70 bg-white/90 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
            {site.templateType.replace("_", " ")}
          </span>
        </header>
        {children}
      </div>
    </main>
  );
}
