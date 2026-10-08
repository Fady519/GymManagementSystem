import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
  /** A button that helps, e.g. "Add your first plan" or "Clear filters". */
  action?: React.ReactNode;
  className?: string;
};

/** What a list shows when it has nothing to show: an icon, a short explanation and what to do next. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-6" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</div>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
