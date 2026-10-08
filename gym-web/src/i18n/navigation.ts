import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

/**
 * Use these instead of next/link and next/navigation for links and redirects.
 * They work with paths WITHOUT the language prefix ("/dashboard") and add "/ar" by themselves
 * when the visitor is browsing in Arabic, so a link never drops the visitor back to English.
 * (useSearchParams and useParams still come from next/navigation.)
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
