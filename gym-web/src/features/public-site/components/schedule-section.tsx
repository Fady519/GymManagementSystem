import { useTranslations } from "next-intl";
import { ScheduleTabs } from "@/features/public-site/components/schedule-tabs";
import {
  Section,
  SectionEmpty,
  SectionUnavailable,
} from "@/features/public-site/components/section";
import type { SessionResponse } from "@/types";

/** The coming week's classes with live spots (GET /api/sessions?state=Upcoming). */
export function ScheduleSection({ sessions }: { sessions: SessionResponse[] | null }) {
  const t = useTranslations("Home.schedule");

  return (
    <Section id="schedule" title={t("title")} subtitle={t("subtitle")} muted>
      {sessions === null ? (
        <SectionUnavailable />
      ) : sessions.length === 0 ? (
        <SectionEmpty>{t("empty")}</SectionEmpty>
      ) : (
        <ScheduleTabs sessions={sessions} />
      )}
    </Section>
  );
}
