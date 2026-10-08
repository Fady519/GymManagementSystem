import { CreditCard, QrCode, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Section } from "@/features/public-site/components/section";

/** Three steps from visitor to member. Each step matches a real feature of the system. */
export function HowItWorks() {
  const t = useTranslations("Home.how");
  const steps = [
    { icon: UserPlus, title: t("step1Title"), body: t("step1Body") },
    { icon: CreditCard, title: t("step2Title"), body: t("step2Body") },
    { icon: QrCode, title: t("step3Title"), body: t("step3Body") },
  ];

  return (
    <Section title={t("title")} muted>
      <ol className="grid gap-6 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="relative space-y-3 rounded-2xl border bg-card p-6">
            <span className="absolute end-6 top-5 text-5xl font-extrabold text-primary/10 tabular-nums">
              {index + 1}
            </span>
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <step.icon className="size-6" />
            </span>
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="text-sm text-pretty text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
