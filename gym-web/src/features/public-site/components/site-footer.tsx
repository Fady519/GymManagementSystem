import { useLocale, useTranslations } from "next-intl";
import { Logo } from "@/components/shared/logo";
import { Link } from "@/i18n/navigation";
import { telLink } from "@/features/public-site/contact-links";
import { CurrentYear } from "@/features/public-site/components/current-year";
import { useSectionLinks } from "@/features/public-site/components/site-header";
import type { GymSettingsResponse } from "@/types";

/** Footer: short about text, section links, member links and the contact details. */
export function SiteFooter({ gym, year }: { gym: GymSettingsResponse | null; year: number }) {
  const t = useTranslations("Home.footer");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const links = useSectionLinks();
  const name = gym?.gymName ?? tCommon("brand");

  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-pretty text-muted-foreground">{t("tagline")}</p>
        </div>

        <FooterColumn title={t("explore")}>
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="hover:text-foreground">
                {link.label}
              </a>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title={t("members")}>
          <li>
            <Link href="/login" className="hover:text-foreground">
              {t("logIn")}
            </Link>
          </li>
          <li>
            <Link href="/register" className="hover:text-foreground">
              {t("join")}
            </Link>
          </li>
        </FooterColumn>

        {gym && (
          <FooterColumn title={name}>
            <li>{locale === "ar" ? gym.addressAr : gym.addressEn}</li>
            <li>
              <a href={telLink(gym.phone)} dir="ltr" className="hover:text-foreground">
                {gym.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${gym.email}`} dir="ltr" className="break-all hover:text-foreground">
                {gym.email}
              </a>
            </li>
          </FooterColumn>
        )}
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-muted-foreground">
          {t.rich("rights", { year: () => <CurrentYear fallback={year} />, name })}
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="space-y-2 text-sm text-muted-foreground">{children}</ul>
    </div>
  );
}
