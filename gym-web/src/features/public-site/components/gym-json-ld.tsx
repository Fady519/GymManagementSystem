import { SITE_URL } from "@/lib/site";
import { hoursOn } from "@/features/public-site/hours";
import type { GymSettingsResponse, PlanResponse } from "@/types";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Structured data (schema.org HealthClub) so Google can show the gym's address, phone and opening
 * hours directly in search results. Everything comes from Gym settings and the active plans.
 */
export function GymJsonLd({
  gym,
  plans,
  locale,
}: {
  gym: GymSettingsResponse;
  plans: PlanResponse[] | null;
  locale: string;
}) {
  const prices = (plans ?? []).map((p) => p.price);

  const openingHours = [6, 0, 1, 2, 3, 4, 5]
    .map((day) => ({ day, hours: hoursOn(gym, day) }))
    .filter((d) => d.hours !== null)
    .map((d) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${DAY_NAMES[d.day]}`,
      opens: d.hours!.opens,
      closes: d.hours!.closes,
    }));

  const data = {
    "@context": "https://schema.org",
    "@type": "HealthClub",
    name: gym.gymName,
    url: locale === "ar" ? `${SITE_URL}/ar` : SITE_URL,
    image: `${SITE_URL}/images/hero-coach.jpg`,
    logo: `${SITE_URL}/images/logo.jpg`,
    telephone: gym.phone,
    email: gym.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: locale === "ar" ? gym.addressAr : gym.addressEn,
      addressLocality: "Cairo",
      addressCountry: "EG",
    },
    hasMap: gym.mapUrl ?? undefined,
    openingHoursSpecification: openingHours,
    priceRange:
      prices.length > 0 ? `EGP ${Math.min(...prices)} - ${Math.max(...prices)}` : undefined,
    sameAs: [gym.facebookUrl, gym.instagramUrl].filter(Boolean),
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe here once "<" is escaped (stops a "</script>" in the data).
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
