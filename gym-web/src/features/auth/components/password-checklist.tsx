import { Check, Circle } from "lucide-react";
import { useTranslations } from "next-intl";
import { PASSWORD_MIN, PASSWORD_RULES } from "@/features/auth/schemas";
import { cn } from "@/lib/utils";

/** Live checklist under a "new password" field: each rule turns green as soon as it is met. */
export function PasswordChecklist({ value }: { value: string }) {
  const t = useTranslations("Auth.passwordRules");

  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs" aria-label={t("label")}>
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value);
        return (
          <li
            key={rule.key}
            className={cn(
              "flex items-center gap-1.5 transition-colors",
              met ? "text-success" : "text-muted-foreground",
            )}
          >
            {met ? <Check className="size-3.5" /> : <Circle className="size-3" />}
            {t(rule.key, { min: PASSWORD_MIN })}
            <span className="sr-only">{met ? t("done") : t("missing")}</span>
          </li>
        );
      })}
    </ul>
  );
}
