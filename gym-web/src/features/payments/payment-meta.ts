import { Banknote, CreditCard, Globe, Smartphone, type LucideIcon } from "lucide-react";
import type { PaymentMethod, PaymentType } from "@/types";

/** Every payment method the API accepts, with a label and icon for buttons and tables. */
export const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: LucideIcon }[] = [
  { value: "Cash", label: "Cash", icon: Banknote },
  { value: "Card", label: "Card", icon: CreditCard },
  { value: "InstaPay", label: "InstaPay", icon: Smartphone },
  { value: "Online", label: "Online", icon: Globe },
];

export const PAYMENT_TYPES: { value: PaymentType; label: string }[] = [
  { value: "Purchase", label: "New membership" },
  { value: "Renewal", label: "Renewal" },
  { value: "Refund", label: "Refund" },
];

/** Badge colors per payment type, the same on every page. */
export const PAYMENT_TYPE_STYLE: Record<PaymentType, string> = {
  Purchase: "border-primary/30 bg-primary/10 text-primary",
  Renewal: "border-success/30 bg-success/10 text-success",
  Refund: "border-destructive/30 bg-destructive/10 text-destructive",
};
