import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import {
  getActivePlans,
  getCopyrightYear,
  getGymSettings,
  getPrograms,
  getPublicStats,
  getPublicTrainers,
  getUpcomingClasses,
} from "@/features/public-site/api";
import { CoachesSection } from "@/features/public-site/components/coaches-section";
import { ContactSection } from "@/features/public-site/components/contact-section";
import { CtaBand } from "@/features/public-site/components/cta-band";
import { GymJsonLd } from "@/features/public-site/components/gym-json-ld";
import { HeroSection } from "@/features/public-site/components/hero-section";
import { HowItWorks } from "@/features/public-site/components/how-it-works";
import { PlansSection } from "@/features/public-site/components/plans-section";
import { ProgramsSection } from "@/features/public-site/components/programs-section";
import { ScheduleSection } from "@/features/public-site/components/schedule-section";
import { SiteFooter } from "@/features/public-site/components/site-footer";
import { SiteHeader } from "@/features/public-site/components/site-header";

// Enough classes to fill the next 7 days of the schedule (the API allows up to 100 per page).
const SCHEDULE_LIMIT = 60;

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale: requested } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const path = locale === "ar" ? "/ar" : "/";

  return {
    // "absolute" skips the "%s | Power Fitness" template from the layout (the title already has the name).
    title: { absolute: t("title") },
    description: t("description"),
    // Tells Google the English and Arabic pages are the same page in two languages.
    alternates: {
      canonical: path,
      languages: { en: "/", ar: "/ar", "x-default": "/" },
    },
    openGraph: {
      type: "website",
      url: path,
      siteName: t("siteName"),
      title: t("title"),
      description: t("description"),
      locale: locale === "ar" ? "ar_EG" : "en_US",
      alternateLocale: locale === "ar" ? "en_US" : "ar_EG",
      images: [{ url: "/images/hero-coach.jpg", width: 358, height: 542, alt: t("siteName") }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: ["/images/hero-coach.jpg"],
    },
  };
}

/**
 * The public home page: a Server Component. All data is loaded on the server, in parallel,
 * from cached fetchers (see features/public-site/api.ts), so the page arrives as ready HTML
 * (fast and good for SEO) and refreshes itself about once a minute when the admin changes something.
 * Every section copes with missing data on its own, so one failing endpoint never breaks the page.
 */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;

  const [gym, stats, plans, programs, trainers, sessions, year] = await Promise.all([
    getGymSettings(),
    getPublicStats(),
    getActivePlans(),
    getPrograms(),
    getPublicTrainers(),
    getUpcomingClasses(SCHEDULE_LIMIT),
    getCopyrightYear(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      {gym && <GymJsonLd gym={gym} plans={plans} locale={locale} />}
      <SiteHeader />
      <main className="flex-1">
        <HeroSection stats={stats} gym={gym} />
        <PlansSection plans={plans} />
        <ProgramsSection programs={programs} trainers={trainers} />
        <ScheduleSection sessions={sessions} />
        <CoachesSection trainers={trainers} />
        <HowItWorks />
        <ContactSection gym={gym} />
        <CtaBand whatsApp={gym?.whatsApp ?? null} />
      </main>
      <SiteFooter gym={gym} year={year} />
    </div>
  );
}
