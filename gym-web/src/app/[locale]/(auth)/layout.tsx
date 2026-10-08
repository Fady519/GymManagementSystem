import { Suspense } from "react";
import Image from "next/image";
import { ArrowLeft, CalendarCheck, QrCode, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { GuestRedirect } from "@/features/auth/components/guest-redirect";
import { NextClassCard } from "@/features/auth/components/next-class-card";
import { Link } from "@/i18n/navigation";

const benefits = [
  { icon: CalendarCheck, text: "Book your spot in any class in seconds" },
  { icon: QrCode, text: "Check in at the door with your personal QR code" },
  { icon: ShieldCheck, text: "Follow your membership, visits and payments in one place" },
];

/**
 * Layout for login, register and the password pages: a brand panel on large screens,
 * and the form on the right (full width on phones).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("AuthNav");

  return (
    <div className="grid min-h-svh flex-1 lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:gap-10 lg:p-12">
        {/* Soft light shapes for depth. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-32 size-[28rem] rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-24 size-[26rem] rounded-full bg-black/20 blur-3xl"
        />

        <Link href="/" className="relative flex items-center gap-3" aria-label="Power Fitness home">
          <Image
            src="/images/logo.jpg"
            alt=""
            width={44}
            height={44}
            className="rounded-md bg-white p-0.5"
          />
          <span className="text-lg font-extrabold tracking-tight uppercase">Power Fitness</span>
        </Link>

        <div className="relative max-w-md space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl leading-tight font-extrabold tracking-tight text-balance">
              Your training, your schedule, all in one place.
            </h2>
            <p className="text-lg text-white/80">
              Members, coaches and staff use the same account to keep every session on track.
            </p>
          </div>
          <ul className="space-y-3">
            {benefits.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/90">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="size-5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative max-w-md">
          <NextClassCard />
        </div>
      </aside>

      <div className="flex flex-col">
        <header className="flex items-center justify-between gap-4 p-4 sm:p-6">
          <div className="lg:invisible">
            <Logo />
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" asChild>
              <Link href="/">
                <ArrowLeft className="rtl:rotate-180" />{" "}
                <span className="max-sm:sr-only">{t("backToWebsite")}</span>
              </Link>
            </Button>
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-4 pt-4 pb-16 sm:px-6">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>

      {/* Reads ?next=, so it needs its own Suspense boundary. It renders nothing. */}
      <Suspense fallback={null}>
        <GuestRedirect />
      </Suspense>
    </div>
  );
}
