"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export type SectionLink = { href: string; label: string };

// Starts downloading the panel code. Called on touch/hover/focus so it is usually ready by the click.
const loadSheet = () =>
  import("@/features/public-site/components/site-mobile-nav-sheet").then(
    (m) => m.SiteMobileNavSheet,
  );

// The panel uses the Radix dialog (~25 KB). Most visitors never open the menu, so it is fetched on
// demand instead of with the page; that keeps the first load on phones lighter.
const SiteMobileNavSheet = dynamic(loadSheet, { ssr: false });

/** The section links in a slide-out menu on phones (the header shows them inline on wider screens). */
export function SiteMobileNav({ links }: { links: SectionLink[] }) {
  const t = useTranslations("Nav");
  const [open, setOpen] = useState(false);
  // Becomes true on the first tap and stays true, so the panel can animate closed and reopen.
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label={t("openMenu")}
        aria-haspopup="dialog"
        onPointerDown={() => void loadSheet()}
        onFocus={() => void loadSheet()}
        onClick={() => {
          setLoaded(true);
          setOpen(true);
        }}
      >
        <Menu aria-hidden />
      </Button>
      {loaded && <SiteMobileNavSheet links={links} open={open} onOpenChange={setOpen} />}
    </>
  );
}
