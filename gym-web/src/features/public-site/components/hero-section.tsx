import Image from "next/image";
import { ArrowRight, CalendarDays } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/features/public-site/components/count-up";
import { OpenNowBadge } from "@/features/public-site/components/open-now-badge";
import type { GymSettingsResponse, PublicStatsResponse } from "@/types";

/** Headline, call-to-action buttons and the live numbers from GET /api/public/stats. */
export function HeroSection({
  stats,
  gym,
}: {
  stats: PublicStatsResponse | null;
  gym: GymSettingsResponse | null;
}) {
  const t = useTranslations("Home");

  // Only numbers that are worth showing: a brand-new gym with 0 members simply hides that tile.
  const tiles = stats
    ? [
        { key: "members", value: stats.activeMembers, label: t("stats.activeMembers") },
        { key: "coaches", value: stats.trainers, label: t("stats.coaches") },
        { key: "classes", value: stats.classesThisWeek, label: t("stats.classesThisWeek") },
      ].filter((tile) => tile.value > 0)
    : [];

  return (
    <section className="relative overflow-hidden">
      {/* Soft brand-colored glow behind the hero. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 mx-auto h-[28rem] max-w-4xl rounded-full bg-primary/15 blur-3xl"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[1.2fr_1fr] md:py-20">
        <div className="space-y-7">
          {gym && <OpenNowBadge hours={gym} />}
          <p className="text-sm font-semibold tracking-widest text-primary uppercase">
            {t("hero.eyebrow")}
          </p>
          <h1 className="text-4xl leading-tight font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {t("hero.titleStart")} <span className="text-primary">{t("hero.titleHighlight")}</span>
          </h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">{t("hero.subtitle")}</p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <a href="#memberships">
                {t("hero.ctaPrimary")} <ArrowRight className="rtl:rotate-180" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#schedule">
                <CalendarDays /> {t("hero.ctaSecondary")}
              </a>
            </Button>
          </div>

          {(tiles.length > 0 || stats?.fromMonthlyPrice) && (
            <dl className="grid max-w-xl grid-cols-2 gap-x-6 gap-y-4 border-t pt-6 sm:grid-cols-4">
              {tiles.map((tile) => (
                <div key={tile.key}>
                  <dt className="text-xs text-muted-foreground">{tile.label}</dt>
                  <dd className="text-2xl font-bold">
                    <CountUp value={tile.value} />
                  </dd>
                </div>
              ))}
              {stats?.fromMonthlyPrice != null && (
                <div>
                  <dt className="text-xs text-muted-foreground">{t("stats.fromPrice")}</dt>
                  <dd className="text-2xl font-bold">
                    <CountUp value={stats.fromMonthlyPrice} money />
                    <span className="text-sm font-medium text-muted-foreground">
                      {t("stats.perMonth")}
                    </span>
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>

        <div className="relative mx-auto hidden w-full max-w-sm md:block">
          <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-3xl bg-primary/20 rtl:-translate-x-4" />
          <div className="relative overflow-hidden rounded-3xl bg-primary shadow-2xl shadow-primary/30">
            <Image
              src="/images/hero-coach.jpg"
              alt={t("hero.imageAlt")}
              width={358}
              height={542}
              className="h-auto w-full"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
