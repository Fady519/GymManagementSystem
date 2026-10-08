import { ArrowRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useFormat } from "@/hooks/use-format";
import { Link } from "@/i18n/navigation";
import { monthlyPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Section,
  SectionEmpty,
  SectionUnavailable,
} from "@/features/public-site/components/section";
import type { PlanResponse } from "@/types";

/** The plans on sale (GET /api/plans?isActive=true), compared by their price per month. */
export function PlansSection({ plans }: { plans: PlanResponse[] | null }) {
  const t = useTranslations("Home.plans");

  return (
    <Section id="memberships" title={t("title")} subtitle={t("subtitle")} muted>
      {plans === null ? (
        <SectionUnavailable />
      ) : plans.length === 0 ? (
        <SectionEmpty>{t("empty")}</SectionEmpty>
      ) : (
        <PlanCards plans={plans} />
      )}
    </Section>
  );
}

function PlanCards({ plans }: { plans: PlanResponse[] }) {
  const t = useTranslations("Home.plans");
  const f = useFormat();

  // The cheapest price per month is the best value, and every plan shows how much it saves
  // against the most expensive monthly rate.
  const monthly = new Map(plans.map((p) => [p.id, monthlyPrice(p.price, p.durationDays)]));
  const highestMonthly = Math.max(...monthly.values());
  const bestValue = plans.reduce((best, p) =>
    monthly.get(p.id)! < monthly.get(best.id)! ? p : best,
  );

  return (
    // Flex + wrap (not a grid) so an incomplete last row is centered.
    <div className="flex flex-wrap justify-center gap-5">
      {plans.map((plan) => {
        const perMonth = monthly.get(plan.id)!;
        const savingPercent = Math.round((1 - perMonth / highestMonthly) * 100);
        const isBest = plans.length > 1 && plan.id === bestValue.id;

        return (
          <Card
            key={plan.id}
            className={cn(
              "relative w-full rounded-2xl transition-all hover:-translate-y-1 hover:shadow-lg sm:w-[calc(50%-0.625rem)] lg:w-[calc((100%-2.5rem)/3)]",
              isBest && "shadow-lg ring-2 shadow-primary/10 ring-primary",
            )}
          >
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                {isBest && <Badge>{t("bestValue")}</Badge>}
              </div>
              <CardDescription>
                {t("length", { duration: f.duration(plan.durationDays) })}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-5">
              <div>
                <p className="text-4xl font-extrabold tracking-tight">{f.money(plan.price)}</p>
                {plan.durationDays > 30 && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("perMonth", { price: f.money(perMonth) })}
                    {savingPercent > 0 && (
                      <span className="ms-2 rounded-full bg-success/10 px-2 py-0.5 font-medium text-success">
                        {t("save", { percent: savingPercent })}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <ul className="space-y-2.5 text-sm">
                {[plan.description, t("perkBooking"), t("perkQr"), t("perkFreeze")].map((perk) => (
                  <li key={perk} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    {perk}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant={isBest ? "default" : "outline"} asChild>
                <Link href="/register">
                  {t("cta")} <ArrowRight className="rtl:rotate-180" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
