import { notFound } from "next/navigation";

/**
 * Catches every address that matches no page (e.g. /ar/whatever) and shows our translated
 * not-found page inside the site layout, instead of Next.js's default English one.
 */
export default function CatchAllPage() {
  notFound();
}
