import Image from "next/image";
import { ArrowRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { AuthNavButtons } from "@/features/auth/components/auth-nav-buttons";
import { ProgramsList } from "@/features/categories/components/programs-list";
import { HeroStats } from "@/features/home/components/hero-stats";
import { PlansGrid } from "@/features/plans/components/plans-grid";
import { UpcomingClasses } from "@/features/sessions/components/upcoming-classes";

const navLinks = [
  { href: "#memberships", label: "Memberships" },
  { href: "#programs", label: "Programs" },
  { href: "#schedule", label: "Schedule" },
];

/**
 * Home page. Every number, plan, program and class on it comes from the API,
 * and every link on it works (they scroll to their section, or open login / sign-up).
 * Booking buttons are added when the member booking pages exist (F5).
 */
export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Button key={link.href} variant="ghost" asChild>
                <a href={link.href}>{link.label}</a>
              </Button>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <AuthNavButtons />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          {/* Soft brand-colored glow behind the hero. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-40 -z-10 mx-auto h-[28rem] max-w-4xl rounded-full bg-primary/15 blur-3xl"
          />
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[1.2fr_1fr] md:py-20">
            <div className="space-y-6">
              <p className="text-sm font-semibold tracking-widest text-primary uppercase">
                Strength · Conditioning · Group classes
              </p>
              <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Stronger every week. <span className="text-primary">Starting today.</span>
              </h1>
              <p className="max-w-xl text-lg text-pretty text-muted-foreground">
                Flexible memberships, experienced coaches and a full weekly class schedule. Book
                your spot online, check in with your QR code and track every visit.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <a href="#memberships">
                    Explore memberships <ArrowRight />
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#schedule">
                    <CalendarDays /> See the schedule
                  </a>
                </Button>
              </div>
              <HeroStats />
            </div>
            <div className="relative mx-auto hidden w-full max-w-sm md:block">
              <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-3xl bg-primary/20" />
              <div className="relative overflow-hidden rounded-3xl bg-primary shadow-2xl shadow-primary/30">
                <Image
                  src="/images/hero-coach.jpg"
                  alt="A Power Fitness coach welcoming new members"
                  width={358}
                  height={542}
                  className="h-auto w-full"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        <section id="memberships" className="scroll-mt-20 border-t bg-muted/40 py-16">
          <div className="mx-auto max-w-6xl space-y-8 px-4">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Memberships</h2>
              <p className="text-muted-foreground">
                Simple pricing with no hidden fees. Longer plans cost less per month, and you can
                freeze your membership whenever you travel.
              </p>
            </div>
            <PlansGrid />
          </div>
        </section>

        <section id="programs" className="scroll-mt-20 py-16">
          <div className="mx-auto max-w-6xl space-y-8 px-4">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Programs</h2>
              <p className="text-muted-foreground">
                From your first workout to your next personal best, every program is led by a coach
                who specializes in it.
              </p>
            </div>
            <ProgramsList />
          </div>
        </section>

        <section id="schedule" className="scroll-mt-20 border-t bg-muted/40 py-16">
          <div className="mx-auto max-w-6xl space-y-8 px-4">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Up next on the schedule</h2>
              <p className="text-muted-foreground">
                Live availability for our next classes. Members book their spot online in seconds.
              </p>
            </div>
            <UpcomingClasses />
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
          <Logo />
          <p className="text-sm text-muted-foreground">© Power Fitness. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
