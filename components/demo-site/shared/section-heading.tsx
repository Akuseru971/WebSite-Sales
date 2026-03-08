import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}

export function SectionHeading({ eyebrow, title, subtitle, align = "left" }: SectionHeadingProps) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      {eyebrow ? (
        <p className="inline-flex rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-4 text-balance font-[var(--font-heading)] text-4xl leading-[1.02] text-ink sm:text-5xl md:text-6xl">{title}</h2>
      {subtitle ? <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-700 md:text-lg">{subtitle}</p> : null}
    </div>
  );
}
