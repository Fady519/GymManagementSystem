"use client";

import { Globe, Loader2, LogOut, UserCog } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout } from "@/features/auth/hooks";
import { Link } from "@/i18n/navigation";
import { initialsOf } from "@/lib/format";
import { roleKey } from "@/lib/roles";
import type { CurrentUserResponse } from "@/types";

/** The avatar button in the top bar: who is logged in, account settings, the website and log out. */
export function UserMenu({ user }: { user: CurrentUserResponse }) {
  const t = useTranslations("UserMenu");
  const tRoles = useTranslations("Roles");
  const logout = useLogout();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-1.5 sm:pe-3" aria-label={t("open")}>
          <Avatar>
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
              {initialsOf(user.fullName)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-40 truncate text-sm font-medium sm:inline" dir="auto">
            {user.fullName}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-1 font-normal">
          {/* The name is shown as stored; dir="auto" lets an English name read correctly in Arabic. */}
          <p className="truncate text-sm font-semibold text-foreground" dir="auto">
            {user.fullName}
          </p>
          <p className="truncate text-xs text-muted-foreground" dir="ltr">
            {user.email}
          </p>
          <Badge variant="secondary" className="mt-1">
            {tRoles(roleKey(user.roles))}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/account">
              <UserCog /> {t("accountSettings")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/">
              <Globe /> {t("visitWebsite")}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={logout.isPending}
          // Keep the menu open while logging out, so the spinner is visible.
          onSelect={(event) => {
            event.preventDefault();
            logout.mutate();
          }}
        >
          {logout.isPending ? <Loader2 className="animate-spin" /> : <LogOut />}
          {logout.isPending ? t("loggingOut") : t("logOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
