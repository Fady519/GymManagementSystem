import { Activity, Dumbbell, Flame, HeartPulse, Medal, Swords, Users } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import {
  Section,
  SectionEmpty,
  SectionUnavailable,
} from "@/features/public-site/components/section";
import type { CategoryResponse, PublicTrainerResponse } from "@/types";

// Decorative icons, given to the programs in turn (program names come from the database).
const ICONS = [Dumbbell, HeartPulse, Swords, Flame, Activity, Medal];

/** Training programs (GET /api/categories) and the coaches who lead each one. */
export function ProgramsSection({
  programs,
  trainers,
}: {
  programs: CategoryResponse[] | null;
  trainers: PublicTrainerResponse[] | null;
}) {
  const t = useTranslations("Home.programs");
  const format = useFormatter();

  return (
    <Section id="programs" title={t("title")} subtitle={t("subtitle")}>
      {programs === null ? (
        <SectionUnavailable />
      ) : programs.length === 0 ? (
        <SectionEmpty>{t("empty")}</SectionEmpty>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {programs.map((program, index) => {
            const Icon = ICONS[index % ICONS.length];
            const coaches = (trainers ?? [])
              .filter((trainer) => trainer.categoryName === program.name)
              .map((trainer) => trainer.name);

            return (
              <li
                key={program.id}
                className="group flex flex-col gap-4 rounded-2xl border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
              >
                <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-6" />
                </span>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">{program.name}</h3>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="size-4" />
                    {t("coaches", { count: program.trainersCount })}
                  </p>
                </div>
                {coaches.length > 0 && (
                  <p className="mt-auto border-t pt-3 text-sm text-muted-foreground">
                    {/* "Led by Karim Adel and Salma Ibrahim" / "بقيادة كريم عادل وسلمى إبراهيم" */}
                    {t("ledBy", { names: format.list(coaches, { type: "conjunction" }) })}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
