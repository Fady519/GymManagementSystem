import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { AuthNavButtons } from "@/features/auth/components/auth-nav-buttons";
import { SiteMobileNav } from "@/features/public-site/components/site-mobile-nav";

/** The anchors of the home page sections, in page order (used by the header and the footer). */
export function useSectionLinks() {
  const t = useTranslations("Home.nav");
  return [
    { href: "#memberships", label: t("memberships") },
    { href: "#programs", label: t("programs") },
    { href: "#schedule", label: t("schedule") },
    { href: "#coaches", label: t("coaches") },
    { href: "#contact", label: t("contact") },
  ];
}

/** Sticky header of the public website. The links scroll to the sections of the home page. */
export function SiteHeader() {
  const t = useTranslations("Nav");
  const links = useSectionLinks();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-1">
          <SiteMobileNav links={links} />
          <Logo />
        </div>
        <nav aria-label={t("main")} className="hidden items-center lg:flex">
          {links.map((link) => (
            <Button key={link.href} variant="ghost" asChild>
              <a href={link.href}>{link.label}</a>
            </Button>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <LocaleSwitcher className="hidden sm:inline-flex" />
          <ThemeToggle />
          <div className="hidden sm:block">
            <AuthNavButtons />
          </div>
        </div>
      </div>
    </header>
  );
}
