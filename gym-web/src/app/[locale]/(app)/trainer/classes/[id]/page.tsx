import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ClassRoster } from "@/features/trainer-portal/components/class-roster";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("TrainerPortal");
  return { title: t("roster.title") };
}

// Rendered only in the browser after the session is restored (see the (app) layout).
export const instant = false;

export default function TrainerClassPage() {
  // The component reads the id with useParams (it needs the logged-in trainer anyway).
  return <ClassRoster />;
}
