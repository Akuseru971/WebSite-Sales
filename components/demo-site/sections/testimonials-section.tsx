import { Quote } from "lucide-react";
import { SectionContainer } from "@/components/demo-site/shared/container";
import { SectionHeading } from "@/components/demo-site/shared/section-heading";
import type { TestimonialsSectionContent } from "@/lib/demo-sites/types";

interface TestimonialsSectionProps {
  content: TestimonialsSectionContent;
}

export function TestimonialsSection({ content }: TestimonialsSectionProps) {
  return (
    <SectionContainer id="testimonials">
      <SectionHeading title={content.title} />
      <div className="mt-12 grid gap-5 md:grid-cols-2 md:gap-6">
        {content.items.map((item) => (
          <blockquote key={item.quote} className="card-premium p-7 md:p-8">
            <Quote className="h-7 w-7 text-accent" aria-hidden="true" />
            <p className="mt-5 text-lg leading-relaxed text-zinc-700">{item.quote}</p>
            <footer className="mt-7 text-sm font-semibold text-ink">{item.author}</footer>
            {item.role ? <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">{item.role}</p> : null}
          </blockquote>
        ))}
      </div>
    </SectionContainer>
  );
}
