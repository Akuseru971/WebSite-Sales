import Image from "next/image";
import { cn } from "@/lib/utils";

interface ImageCardProps {
  src?: string;
  alt: string;
  className?: string;
}

export function ImageCard({ src, alt, className }: ImageCardProps) {
  return (
    <div className={cn("group relative overflow-hidden rounded-[1.9rem] border border-white/50 bg-zinc-200 shadow-soft", className)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition duration-700 group-hover:scale-[1.05]"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-200 to-zinc-300" aria-hidden="true" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-black/10" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/35" aria-hidden="true" />
    </div>
  );
}
