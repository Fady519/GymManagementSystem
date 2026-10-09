import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { Providers } from "@/app/providers";
import { pickMessages, ROOT_CLIENT_NAMESPACES } from "@/i18n/client-messages";
import { directionOf, routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";
import "../globals.css";

// next/font downloads the fonts at build time and serves them from our own domain.
// Inter draws every Latin letter and digit in both languages (so "Premium Plan" looks the same on
// English and Arabic pages). The Arabic letters come from IBM Plex Sans Arabic, which is declared in
// globals.css instead (see the comment there for why); globals.css chains them in --font-sans.
const inter = Inter({
  variable: "--font-latin",
  subsets: ["latin"],
});

// The Arabic font files (public/fonts). Preloading them on Arabic pages means the browser fetches
// them together with the page, so the text is drawn once in the right font instead of jumping.
const ARABIC_FONT_FILES = [400, 500, 600, 700].map(
  (weight) => `/fonts/ibm-plex-sans-arabic-${weight}.woff2`,
);

// Only used for code-like text, so it isn't worth preloading on every page.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
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

  // React adds these as <link rel="preload"> tags in <head>. English pages skip them entirely.
  if (locale === "ar") {
    for (const href of ARABIC_FONT_FILES) {
      preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
    }
  }
  const messages = await getMessages();

  return (
    // suppressHydrationWarning: next-themes adds the "dark" class before React loads (avoids a white flash).
    <html
      lang={locale}
      dir={directionOf(locale)}
      className={`${inter.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        {/* Gives client components the current language and the messages every page needs.
            The logged-in and auth layouts add the rest (see i18n/client-messages.ts). */}
        <NextIntlClientProvider messages={pickMessages(messages, ROOT_CLIENT_NAMESPACES)}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
