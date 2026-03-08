import { cn } from "@/lib/utils";
import type { DemoSiteRecord } from "@/lib/demo-sites/types";

interface TemplateShellProps {
  site: DemoSiteRecord;
  className?: string;
  children: React.ReactNode;
}

export function TemplateShell({ site, className, children }: TemplateShellProps) {
  const adaptive = site.generatedContent.adaptiveSiteJson;
  const isSolidNav = adaptive?.navStyle === "solid";
  const navStyleClass =
    isSolidNav
      ? "border-transparent bg-ink text-white"
      : adaptive?.navStyle === "minimal"
        ? "border-zinc-200/70 bg-white/85"
        : "border-white/80 bg-white/70 backdrop-blur";

  const shellClass =
    adaptive?.sectionPresentation === "immersive"
      ? "bg-gradient-to-b from-zinc-950 via-zinc-900 to-stone-900 text-zinc-100"
      : adaptive?.sectionPresentation === "minimal"
        ? "bg-gradient-to-b from-zinc-50 via-white to-zinc-100"
        : adaptive?.sectionPresentation === "corporate"
          ? "bg-gradient-to-b from-slate-100 via-white to-zinc-100"
          : "bg-gradient-to-b from-stone-50 via-[#f6efe7] to-[#f4ece3]";

  return (
    <main
      className={cn("relative min-h-screen overflow-hidden", shellClass, className)}
      style={{
        ["--theme-primary" as string]: site.generatedContent.theme.primaryColor,
        ["--theme-secondary" as string]: site.generatedContent.theme.secondaryColor,
        ["--theme-accent" as string]: site.generatedContent.theme.accentColor,
      }}
    >
      <div className="pointer-events-none absolute left-0 top-0 h-[38rem] w-full bg-mesh-soft opacity-80" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 grain-overlay opacity-20" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-sand/85" aria-hidden="true" />
      <div className="relative z-10">
        <header className={cn("mx-auto mt-4 flex w-full max-w-6xl items-center justify-between rounded-2xl px-4 py-3 shadow-soft sm:px-6 lg:px-8", navStyleClass)}>
          <div className="min-w-0">
            <p className={cn("text-[11px] font-semibold uppercase tracking-[0.2em]", isSolidNav ? "text-zinc-300" : "text-zinc-500")}>Demo Concept</p>
            <p className={cn("truncate font-[var(--font-heading)] text-2xl leading-tight", isSolidNav ? "text-white" : "text-ink")}>{site.generatedContent.businessInfo.name}</p>
          </div>
          <span className={cn("ml-4 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]", isSolidNav ? "border border-zinc-700 bg-zinc-800 text-zinc-100" : "border border-zinc-300/70 bg-white/90 text-zinc-600")}>
            {site.templateType.replace("_", " ")}
          </span>
        </header>
        {children}
      </div>
    </main>
  );
}
