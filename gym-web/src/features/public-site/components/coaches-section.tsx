import { CalendarCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { initialsOf } from "@/lib/format";
import {
  Section,
  SectionEmpty,
  SectionUnavailable,
} from "@/features/public-site/components/section";
import type { PublicTrainerResponse } from "@/types";

const MAX_COACHES = 8;

/** The coaching team (GET /api/public/trainers: names and specialties only, no private data). */
export function CoachesSection({ trainers }: { trainers: PublicTrainerResponse[] | null }) {
  const t = useTranslations("Home.coaches");

  return (
    <Section id="coaches" title={t("title")} subtitle={t("subtitle")}>
      {trainers === null ? (
        <SectionUnavailable />
      ) : trainers.length === 0 ? (
        <SectionEmpty>{t("empty")}</SectionEmpty>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trainers.slice(0, MAX_COACHES).map((trainer) => (
            <li
              key={trainer.id}
              className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <span
                aria-hidden
                className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-2xl font-bold text-primary-foreground shadow-md shadow-primary/20"
              >
                {initialsOf(trainer.name)}
              </span>
              <div className="space-y-1.5">
                <h3 className="font-semibold">{trainer.name}</h3>
                <Badge variant="secondary">{trainer.categoryName}</Badge>
              </div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarCheck className="size-4" />
                {t("upcoming", { count: trainer.upcomingClasses })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
