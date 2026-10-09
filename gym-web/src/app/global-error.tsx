"use client"; // Error boundaries must be Client Components (they use React state to catch errors).

import { useEffect } from "react";
import "./globals.css";

/**
 * The last safety net: shown only if the root layout itself crashes (for example while loading
 * the language or the providers). It replaces the whole document, so it must render its own
 * <html> and <body>, and none of our providers (translations, theme) exist here. That is why the
 * text is written in both languages directly in this file instead of coming from messages/*.json.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-svh flex-col items-center justify-center gap-10 bg-background px-6 py-16 text-center font-sans text-foreground antialiased">
        <title>Something went wrong | Power Fitness</title>

        {/* Each language is its own block with its own lang and dir, so screen readers switch
            voice and the Arabic text flows right-to-left. */}
        <section lang="ar" dir="rtl" className="flex max-w-md flex-col gap-2">
          <h1 className="text-2xl font-bold">حدث خطأ غير متوقع</h1>
          <p className="text-muted-foreground">
            نعتذر عن ذلك. حاول مرة أخرى، وإذا استمرت المشكلة فأعد تحميل الصفحة.
          </p>
        </section>

        <section className="flex max-w-md flex-col gap-2">
          <h2 className="text-2xl font-bold">Something went wrong</h2>
          <p className="text-muted-foreground">
            Sorry about that. Please try again, and reload the page if the problem continues.
          </p>
        </section>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <span lang="ar">حاول مرة أخرى</span>
            {" / "}
            <span>Try again</span>
          </button>
          {/* A plain <a> on purpose: <Link> keeps the broken app in memory, while a full page
              load rebuilds it from scratch. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <span lang="ar">الصفحة الرئيسية</span>
            {" / "}
            <span>Home</span>
          </a>
        </div>

        {error.digest && (
          <p className="text-xs text-muted-foreground" dir="ltr">
            Ref: {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
