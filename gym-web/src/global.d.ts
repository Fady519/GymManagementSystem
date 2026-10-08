import type messages from "../messages/en.json";
import type { routing } from "@/i18n/routing";

// Teaches TypeScript our languages and message keys, so t("Home.titel") is a compile error
// instead of a missing text on the page. English is the reference; Arabic must have the same keys
// (checked by scripts/check-messages.mjs).
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
