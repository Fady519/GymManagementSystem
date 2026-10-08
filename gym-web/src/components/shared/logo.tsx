import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** The Power Fitness logo + name. Links to the home page. */
export function Logo() {
  const t = useTranslations("Common");

  return (
    <Link href="/" className="flex items-center gap-2" aria-label={t("logoLabel")}>
      <Image
        src="/images/logo.jpg"
        alt=""
        width={44}
        height={44}
        className="rounded-md bg-white p-0.5"
        priority
      />
      <span className="text-lg font-extrabold tracking-tight text-primary uppercase">
        {t("brand")}
      </span>
    </Link>
  );
}
