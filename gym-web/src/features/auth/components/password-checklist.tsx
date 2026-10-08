import { Check, Circle } from "lucide-react";
import { PASSWORD_RULES } from "@/features/auth/schemas";
import { cn } from "@/lib/utils";

/** Live checklist under a "new password" field: each rule turns green as soon as it is met. */
export function PasswordChecklist({ value }: { value: string }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs" aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value);
        return (
          <li
            key={rule.label}
            className={cn(
              "flex items-center gap-1.5 transition-colors",
              met ? "text-success" : "text-muted-foreground",
            )}
          >
            {met ? <Check className="size-3.5" /> : <Circle className="size-3" />}
            {rule.label}
            <span className="sr-only">{met ? "(done)" : "(missing)"}</span>
          </li>
        );
      })}
    </ul>
  );
}
