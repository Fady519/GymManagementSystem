import type { Metadata } from "next";
import { Geist_Mono, IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Providers } from "@/app/providers";
import { directionOf, routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";
import "../globals.css";

// One UI font per language. next/font downloads them at build time and serves them from our own domain.
// Both set the same --font-sans variable, and the layout only applies the one for the current language.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// IBM Plex Sans Arabic has matching Latin letters, so mixed text (e.g. "Premium Plan") looks consistent.
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-sans",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Build both languages at build time (the locale is the first part of the URL).
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale: requested } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t("title"),
      template: `%s | ${t("siteName")}`,
    },
    description: t("description"),
    applicationName: t("siteName"),
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const font = locale === "ar" ? plexArabic : inter;

  return (
    // suppressHydrationWarning: next-themes adds the "dark" class before React loads (avoids a white flash).
    <html
      lang={locale}
      dir={directionOf(locale)}
      className={`${font.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        {/* Gives client components the current language and its messages (useTranslations). */}
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
