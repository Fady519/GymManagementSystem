import { useMemo } from "react";
import { Banknote, CreditCard, Globe, Smartphone, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PaymentMethod, PaymentType } from "@/types";

/**
 * Icons and colors for payment methods and types, the same on every page.
 * The words come from the "Enums" messages (Enums.PaymentMethod / Enums.PaymentType), so use
 * usePaymentLabels() below to show them in the visitor's language.
 */

/** One icon per payment method. */
export const PAYMENT_METHOD_ICON: Record<PaymentMethod, LucideIcon> = {
  Cash: Banknote,
  Card: CreditCard,
  InstaPay: Smartphone,
  Online: Globe,
};

/**
 * Every payment method the API accepts, in display order (no words here: the label comes from
 * the Enums messages, e.g. usePaymentLabels().methods or t(`PaymentMethod.${value}`)).
 */
export const PAYMENT_METHODS: { value: PaymentMethod; icon: LucideIcon }[] = [
  { value: "Cash", icon: Banknote },
  { value: "Card", icon: CreditCard },
  { value: "InstaPay", icon: Smartphone },
  { value: "Online", icon: Globe },
];

/** Every payment type, in display order (labels come from the Enums messages). */
export const PAYMENT_TYPES: { value: PaymentType }[] = [
  { value: "Purchase" },
  { value: "Renewal" },
  { value: "Refund" },
];

/** Badge colors per payment type, the same on every page. */
export const PAYMENT_TYPE_STYLE: Record<PaymentType, string> = {
  Purchase: "border-primary/30 bg-primary/10 text-primary",
  Renewal: "border-success/30 bg-success/10 text-success",
  Refund: "border-destructive/30 bg-destructive/10 text-destructive",
};

/**
 * Payment words in the visitor's language:
 *   const labels = usePaymentLabels();
 *   labels.method("Cash")      // "Cash" | "نقدًا"
 *   labels.type("Purchase")    // "New membership" | "اشتراك جديد"
 *   labels.methods             // [{ value, label, icon }] for pickers and filters
 *   labels.types               // [{ value, label }]
 */
export function usePaymentLabels() {
  const t = useTranslations("Enums");

  return useMemo(() => {
    const method = (value: PaymentMethod) => t(`PaymentMethod.${value}`);
    const type = (value: PaymentType) => t(`PaymentType.${value}`);
    return {
      method,
      type,
      methods: PAYMENT_METHODS.map((m) => ({ ...m, label: method(m.value) })),
      types: PAYMENT_TYPES.map((p) => ({ ...p, label: type(p.value) })),
    };
  }, [t]);
}
