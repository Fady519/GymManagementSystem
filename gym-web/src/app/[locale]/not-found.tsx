import { Home, SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { StatusPage } from "@/components/shared/status-page";
import { BackButton } from "@/components/shared/back-button";
import { Link } from "@/i18n/navigation";

/**
 * Shown for any unknown address (see [...rest]/page.tsx) and whenever a page calls notFound(),
 * in the visitor's language and inside the normal site layout.
 */
export default function NotFound() {
  const t = useTranslations("NotFound");
  const tMeta = useTranslations("Metadata");

  return (
    <>
      {/* not-found pages can't export metadata, so the tab title is set here (React 19 hoists it).
          The layout's "%s | Power Fitness" template doesn't apply to a raw <title>, so we add it. */}
      <title>{`${t("metaTitle")} | ${tMeta("siteName")}`}</title>
      <meta name="robots" content="noindex" />
      <StatusPage
        icon={SearchX}
        code={t("code")}
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <Button asChild>
              <Link href="/">
                <Home aria-hidden /> {t("home")}
              </Link>
            </Button>
            <BackButton label={t("back")} />
          </>
        }
      />
    </>
  );
}
