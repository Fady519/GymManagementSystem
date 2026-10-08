import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormFieldProps = {
  id: string;
  label: string;
  /** The error message for this field (from Zod or from the API). */
  error?: string;
  /** Small help text under the input, hidden while there is an error. */
  description?: React.ReactNode;
  /** Something on the right of the label, e.g. a "Forgot password?" link. */
  labelAction?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

/** Label + input + error message, laid out the same way in every form. */
export function FormField({
  id,
  label,
  error,
  description,
  labelAction,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {labelAction}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : description ? (
        <div id={`${id}-description`} className="text-sm text-muted-foreground">
          {description}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The accessibility props an input needs to work with FormField:
 * screen readers announce the field as invalid and read the error message.
 */
export function fieldProps(id: string, error: string | undefined, hasDescription = false) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hasDescription ? `${id}-description` : undefined,
  } as const;
}
