import { ArrowRight, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { whatsAppLink } from "@/features/public-site/contact-links";

/** The last push before the footer: sign up, or ask a question on WhatsApp (if the gym has one). */
export function CtaBand({ whatsApp }: { whatsApp: string | null }) {
  const t = useTranslations("Home.cta");

  return (
    <section className="px-4 py-16 md:py-20">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-primary px-6 py-12 text-primary-foreground shadow-2xl shadow-primary/20 md:px-12 md:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-20 -top-20 size-72 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-balance md:text-4xl">
              {t("title")}
            </h2>
            <p className="text-lg text-pretty">{t("body")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/register">
                {t("primary")} <ArrowRight className="rtl:rotate-180" />
              </Link>
            </Button>
            {/* bg-primary (not transparent): the decorative glow sits behind this corner and would
                lighten the background under the text below the 4.5:1 contrast minimum. The dark: classes
                override the outline variant's own dark-mode background, which is semi-transparent. */}
            {whatsApp && (
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/40 bg-primary text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground dark:border-primary-foreground/40 dark:bg-primary dark:hover:bg-primary-foreground/10"
                asChild
              >
                <a href={whatsAppLink(whatsApp)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle /> {t("secondary")}
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
