import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";

/** The same layout for every section of the home page: anchor id, title, intro text, content. */
export function Section({
  id,
  title,
  subtitle,
  muted = false,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn("scroll-mt-20 py-16 md:py-20", muted && "border-y bg-muted/40")}>
      <div className="mx-auto max-w-6xl space-y-10 px-4">
        <div className="max-w-2xl space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-balance md:text-4xl">{title}</h2>
          {subtitle && <p className="text-lg text-pretty text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

/** Shown inside a section when its data couldn't be loaded, so the rest of the page still works. */
export function SectionUnavailable() {
  const t = useTranslations("Home");
  return (
    <p className="flex items-center justify-center gap-2 rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
      <CloudOff className="size-5 shrink-0" />
      {t("unavailable")}
    </p>
  );
}

/** Shown when a section loaded fine but has nothing to show yet (e.g. no plans on sale). */
export function SectionEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
      {children}
    </p>
  );
}
