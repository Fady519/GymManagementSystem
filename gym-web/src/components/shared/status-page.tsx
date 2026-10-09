import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/shared/logo";

/**
 * The full-page frame for "not found" and "something went wrong": the logo, a big icon or code,
 * a short explanation and what to do next. Used by not-found.tsx and error.tsx.
 *
 * variant="inline" is for the logged-in area: the app shell around it already has the logo and
 * the <main> landmark, so we render a plain block (a page may only have one <main>).
 */
export function StatusPage({
  icon: Icon,
  code,
  title,
  description,
  actions,
  footnote,
  variant = "page",
}: {
  icon: LucideIcon;
  code?: string;
  title: string;
  description: string;
  actions: React.ReactNode;
  footnote?: React.ReactNode;
  variant?: "page" | "inline";
}) {
  const Wrapper = variant === "page" ? "main" : "div";

  return (
    <Wrapper
      className={
        variant === "page"
          ? "flex min-h-svh flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center"
          : "flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center"
      }
    >
      {variant === "page" && <Logo />}
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-8" aria-hidden />
        </div>
        {code && (
          <p className="text-sm font-semibold tracking-widest text-muted-foreground" dir="ltr">
            {code}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">{title}</h1>
        <p className="max-w-md text-pretty text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">{actions}</div>
      {footnote && <p className="text-xs text-muted-foreground">{footnote}</p>}
    </Wrapper>
  );
}
