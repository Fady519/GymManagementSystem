"use client";

import { CalendarClock, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpcomingSessions } from "@/features/sessions/queries";
import { useFormat } from "@/hooks/use-format";

/**
 * Live "next class" card for the brand panel on the login/register pages.
 * It shares its cache with the home page schedule. If there is no upcoming class (or the
 * request fails), the card is simply not shown.
 */
export function NextClassCard() {
  const t = useTranslations("Auth.nextClass");
  const f = useFormat();
  const { data, isPending } = useUpcomingSessions(1);

  if (isPending) return <Skeleton className="h-28 rounded-2xl bg-white/10" />;

  const next = data?.items[0];
  if (!next) return null;

  const almostFull = next.availableSlots > 0 && next.availableSlots <= 3;

  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
      <p className="text-xs font-semibold tracking-widest text-white/70 uppercase">{t("label")}</p>
      <p className="mt-2 text-lg font-bold">
        {/* Category and trainer names are admin-entered data: shown as stored, isolated by <bdi>. */}
        {t.rich("title", {
          category: next.categoryName,
          trainer: next.trainerName,
          bdi: (chunks) => <bdi>{chunks}</bdi>,
        })}
      </p>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
        <span className="flex items-center gap-1.5">
          <CalendarClock className="size-4" /> {f.classTime(next.startDate)}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="size-4" />
          {next.availableSlots === 0
            ? t("fullyBooked")
            : t("spotsLeft", {
                left: f.number(next.availableSlots),
                capacity: f.number(next.capacity),
              })}
          {almostFull && (
            <span className="rounded-full bg-warning px-2 py-0.5 text-xs font-semibold text-black">
              {t("fillingFast")}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
