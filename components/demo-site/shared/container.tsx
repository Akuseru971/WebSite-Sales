import { cn } from "@/lib/utils";

interface SectionContainerProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
}

export function SectionContainer({ id, className, children }: SectionContainerProps) {
  return (
    <section id={id} className={cn("section-shell", className)}>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}
