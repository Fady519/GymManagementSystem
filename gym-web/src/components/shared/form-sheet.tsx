"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type FormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** The id of the <form> inside, so the Save button in the footer can submit it. */
  formId: string;
  submitLabel: string;
  submitting: boolean;
  children: React.ReactNode;
};

/**
 * A side panel for add/edit forms. The table stays visible behind it, so the admin keeps
 * their place. The footer sticks to the bottom while long forms scroll.
 */
export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  formId,
  submitLabel,
  submitting,
  children,
}: FormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle className="text-lg">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">{children}</div>

        <SheetFooter className="flex-row justify-end border-t">
          <SheetClose asChild>
            <Button variant="outline" disabled={submitting}>
              Cancel
            </Button>
          </SheetClose>
          {/* form={formId} lets this button submit a form it isn't inside of. */}
          <Button type="submit" form={formId} disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            {submitLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
