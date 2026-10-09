"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { Logo } from "@/components/shared/logo";
import { AuthNavButtons } from "@/features/auth/components/auth-nav-buttons";
import type { SectionLink } from "@/features/public-site/components/site-mobile-nav";
import { directionOf } from "@/i18n/routing";

/**
 * The slide-out panel of the phone menu. Loaded only after the first tap on the menu button
 * (see SiteMobileNav), so the dialog code is not part of the first page load.
 */
export function SiteMobileNavSheet({
  links,
  open,
  onOpenChange,
}: {
  links: SectionLink[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Nav");
  const locale = useLocale();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={directionOf(locale) === "rtl" ? "right" : "left"}
        className="flex w-72 flex-col gap-6 p-4"
      >
        <SheetHeader className="p-0 pt-1">
          <SheetTitle asChild>
            <div>
              <Logo />
            </div>
          </SheetTitle>
          <SheetDescription className="sr-only">{t("main")}</SheetDescription>
        </SheetHeader>
        <nav aria-label={t("main")} className="flex flex-col gap-1">
          {links.map((link) => (
            // Closing the menu first lets the page scroll smoothly to the section.
            <a
              key={link.href}
              href={link.href}
              onClick={() => onOpenChange(false)}
              className="rounded-md px-3 py-2.5 text-base font-medium transition-colors hover:bg-accent"
            >
              {link.label}
            </a>
          ))}
        </nav>
        {/* On phones the header has no room for these, so they live at the bottom of the menu. */}
        <div className="mt-auto flex flex-col gap-3 border-t pt-4">
          <AuthNavButtons />
          <LocaleSwitcher className="w-full" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
