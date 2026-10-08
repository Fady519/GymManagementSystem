import type { ReactNode } from "react";
import { Clock, ExternalLink, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { telLink, whatsAppLink } from "@/features/public-site/contact-links";
import { OpeningHours } from "@/features/public-site/components/opening-hours";
import { Section, SectionUnavailable } from "@/features/public-site/components/section";
import { FacebookIcon, InstagramIcon } from "@/features/public-site/components/social-icons";
import type { GymSettingsResponse } from "@/types";

/** Address, phone, WhatsApp, email, opening hours and social links, all from Gym settings. */
export function ContactSection({ gym }: { gym: GymSettingsResponse | null }) {
  const t = useTranslations("Home.contact");
  const locale = useLocale();

  return (
    <Section id="contact" title={t("title")} subtitle={t("subtitle")} muted>
      {gym === null ? (
        <SectionUnavailable />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            <ContactCard icon={<MapPin />} label={t("address")} className="sm:col-span-2">
              <p className="text-base font-medium">
                {locale === "ar" ? gym.addressAr : gym.addressEn}
              </p>
              {gym.mapUrl && (
                <Button variant="link" className="h-auto p-0" asChild>
                  <a href={gym.mapUrl} target="_blank" rel="noopener noreferrer">
                    {t("openMap")} <ExternalLink />
                  </a>
                </Button>
              )}
            </ContactCard>

            <ContactCard icon={<Phone />} label={t("phone")}>
              <a
                href={telLink(gym.phone)}
                dir="ltr"
                className="text-base font-medium hover:text-primary"
              >
                {gym.phone}
              </a>
            </ContactCard>

            {gym.whatsApp ? (
              <ContactCard icon={<MessageCircle />} label={t("whatsApp")}>
                <a
                  href={whatsAppLink(gym.whatsApp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-medium hover:text-primary"
                >
                  {t("chat")}
                </a>
              </ContactCard>
            ) : null}

            <ContactCard
              icon={<Mail />}
              label={t("email")}
              className={gym.whatsApp ? "sm:col-span-2" : undefined}
            >
              <a
                href={`mailto:${gym.email}`}
                dir="ltr"
                className="text-base font-medium break-all hover:text-primary"
              >
                {gym.email}
              </a>
            </ContactCard>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6">
            <h3 className="flex items-center gap-2 font-semibold">
              <Clock className="size-5 text-primary" /> {t("hours")}
            </h3>
            <OpeningHours hours={gym} />

            {(gym.facebookUrl || gym.instagramUrl) && (
              <div className="mt-auto space-y-3 border-t pt-4">
                <p className="text-sm font-medium">{t("follow")}</p>
                <div className="flex gap-2">
                  {gym.facebookUrl && (
                    <Button variant="outline" size="icon" asChild>
                      <a
                        href={gym.facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Facebook"
                      >
                        <FacebookIcon className="size-4" />
                      </a>
                    </Button>
                  )}
                  {gym.instagramUrl && (
                    <Button variant="outline" size="icon" asChild>
                      <a
                        href={gym.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Instagram"
                      >
                        <InstagramIcon className="size-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Section>
  );
}

function ContactCard({
  icon,
  label,
  className,
  children,
}: {
  icon: ReactNode;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex gap-4 rounded-2xl border bg-card p-5", className)}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:size-5">
        {icon}
      </span>
      <div className="min-w-0 space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        {children}
      </div>
    </div>
  );
}
