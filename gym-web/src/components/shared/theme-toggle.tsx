"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

// Starts downloading the menu code. Called on hover/focus so it is usually ready before the click.
const loadThemeMenu = () => import("@/components/shared/theme-menu").then((m) => m.ThemeMenu);

// The dropdown (Radix menu + positioning library, ~70 KB) is only needed once someone opens it,
// so it is split into its own file and fetched on demand. While it loads, the same button is shown.
const ThemeMenu = dynamic(loadThemeMenu, { ssr: false, loading: () => <ThemeButton /> });

/** The round sun/moon button. Shared by the placeholder below and by the real menu trigger. */
export function ThemeButton(props: React.ComponentProps<typeof Button>) {
  const t = useTranslations("Theme");

  return (
    <Button variant="outline" size="icon" aria-label={t("change")} title={t("change")} {...props}>
      {/* Both icons are rendered; CSS shows the right one, so there is no flash before React loads. */}
      <Sun className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" aria-hidden />
      <Moon
        className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
        aria-hidden
      />
    </Button>
  );
}

/** Light / dark / system theme switcher. The choice is saved in localStorage by next-themes. */
export function ThemeToggle() {
  const [wanted, setWanted] = useState(false);

  if (wanted) return <ThemeMenu />;

  return (
    <ThemeButton
      aria-haspopup="menu"
      onPointerEnter={() => void loadThemeMenu()}
      onFocus={() => void loadThemeMenu()}
      onClick={() => setWanted(true)}
    />
  );
}
