"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/hooks";
import { useHydrated } from "@/hooks/use-hydrated";
import { AREA_HOME, type Area } from "@/lib/roles";

const HOME_LABEL: Record<Area, string> = {
  admin: "Dashboard",
  trainer: "My schedule",
  member: "My membership",
};

/**
 * The buttons on the right of the public header:
 * visitors see "Log in" and "Join now", logged-in users get a button back to their area.
 */
export function AuthNavButtons() {
  const { status, area } = useAuth();
  const hydrated = useHydrated();

  // While the session is being restored, keep the space so the header doesn't jump.
  if (!hydrated || status === "unknown") return <Skeleton className="h-8 w-36" />;

  if (status === "authenticated" && area) {
    return (
      <Button asChild>
        <Link href={AREA_HOME[area]}>
          {HOME_LABEL[area]} <ArrowRight />
        </Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" asChild>
        <Link href="/login">Log in</Link>
      </Button>
      <Button asChild>
        <Link href="/register">Join now</Link>
      </Button>
    </div>
  );
}
