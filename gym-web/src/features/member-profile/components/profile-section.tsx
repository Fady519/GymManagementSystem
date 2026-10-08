"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** A titled card; every section of the profile page looks the same. */
export function ProfileSection({
  icon,
  title,
  description,
  children,
  footer,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold [&_svg]:size-5 [&_svg]:text-primary">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">{children}</CardContent>
      {footer && <CardFooter className="flex-wrap justify-end gap-2">{footer}</CardFooter>}
    </Card>
  );
}

/**
 * The buttons under each form. Each form saves on its own, so each one says whether it has
 * unsaved changes and can put the saved values back.
 */
export function SaveBar({
  dirty,
  pending,
  onDiscard,
}: {
  dirty: boolean;
  pending: boolean;
  onDiscard: () => void;
}) {
  const t = useTranslations("MemberProfile");
  const tCommon = useTranslations("Common");
  return (
    <>
      {dirty && (
        <p className="me-auto flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-2 rounded-full bg-warning" aria-hidden />
          {t("unsaved")}
        </p>
      )}
      <Button type="button" variant="ghost" disabled={!dirty || pending} onClick={onDiscard}>
        {t("discard")}
      </Button>
      <Button type="submit" disabled={!dirty || pending}>
        {pending && <Loader2 className="animate-spin" />}
        {pending ? tCommon("saving") : tCommon("save")}
      </Button>
    </>
  );
}
