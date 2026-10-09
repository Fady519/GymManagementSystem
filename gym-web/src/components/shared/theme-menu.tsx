"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeButton } from "@/components/shared/theme-toggle";

/**
 * The light / dark / system menu itself. It is loaded only when the visitor first clicks the theme
 * button (see ThemeToggle), so the dropdown code is not part of the first page load.
 */
export function ThemeMenu() {
  const t = useTranslations("Theme");
  const { setTheme } = useTheme();

  return (
    // defaultOpen: this component appears because the user just clicked, so open right away.
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>
        <ThemeButton />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun aria-hidden /> {t("light")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon aria-hidden /> {t("dark")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor aria-hidden /> {t("system")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
