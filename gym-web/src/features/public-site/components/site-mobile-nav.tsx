"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
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
import { directionOf } from "@/i18n/routing";

export type SectionLink = { href: string; label: string };

/** The section links in a slide-out menu on phones (the header shows them inline on wider screens). */
export function SiteMobileNav({ links }: { links: SectionLink[] }) {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label={t("openMenu")}
        onClick={() => setOpen(true)}
      >
        <Menu />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
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
                onClick={() => setOpen(false)}
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
    </>
  );
}
