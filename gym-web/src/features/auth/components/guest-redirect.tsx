"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/hooks";
import { landingPath } from "@/lib/roles";

/**
 * Lives on the login/register/password pages. As soon as there is a session (the user just logged in,
 * or opened /login while already logged in) it moves them on: to `?next=` if it is a page they may
 * open, otherwise to their home page. Having ONE place that redirects avoids two competing redirects.
 */
export function GuestRedirect() {
  const { status, area } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next");

  useEffect(() => {
    if (status === "authenticated" && area) {
      router.replace(landingPath(area, next));
    }
  }, [status, area, next, router]);

  return null;
}
