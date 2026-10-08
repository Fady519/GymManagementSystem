/** The title and subtitle at the top of every auth form. */
export function AuthHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-8 space-y-2">
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

/** Moved to the shared form helpers (admin forms use it too); re-exported so auth imports keep working. */
export { FormError } from "@/components/shared/form-field";
