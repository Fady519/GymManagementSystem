import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { PlansGrid } from "@/features/plans/components/plans-grid";

/**
 * F0 preview page: shows the design system (colors, buttons, badges, dark mode)
 * and proves the whole chain works: browser -> Next.js rewrite -> ASP.NET Core API -> SQL Server.
 * The real public landing page replaces it in F5.
 */
export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-12 px-4 py-10">
        <section className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <Badge variant="secondary">F0 · Design system preview</Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-balance text-primary sm:text-5xl">
              Train smarter. Get stronger.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              The plans below are loaded live from the ASP.NET Core API through TanStack Query.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="lg">View plans</Button>
              <Button size="lg" variant="outline">
                Book a class
              </Button>
            </div>
          </div>
          <div className="hidden overflow-hidden rounded-2xl bg-primary md:block">
            <Image
              src="/images/hero-coach.jpg"
              alt="Power Fitness coach"
              width={240}
              height={364}
              priority
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Membership plans</h2>
          <PlansGrid />
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Design system</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Cancelled</Badge>
            <Badge className="bg-success text-white">Active</Badge>
            <Badge className="bg-warning text-black">Frozen</Badge>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © Power Fitness
      </footer>
    </div>
  );
}
