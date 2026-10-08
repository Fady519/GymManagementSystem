"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarCheck, Check, Hourglass, IdCard, UserRound, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { useFormat } from "@/hooks/use-format";
import { cn } from "@/lib/utils";
import type { CheckInResultResponse } from "@/types";
import { Link } from "@/i18n/navigation";

/** What the desk shows after a scan: the API's answer, or "this code belongs to nobody". */
export type CheckInOutcome =
  { kind: "result"; id: number; data: CheckInResultResponse } | { kind: "unknown"; id: number };

/** How long the result stays on screen before the desk is ready for the next member. */
export const RESULT_SECONDS = 5;

/** A small white pill with an icon, e.g. "12 days left". */
function Chip({ icon: Icon, children }: { icon: typeof Check; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium backdrop-blur">
      <Icon className="size-4" />
      {children}
    </span>
  );
}

/**
 * The sentence under the name. The API also sends an English `message`, but we never show it:
 * the text is built here from the result and the deny reason, in the page language.
 */
function useResultMessage(data: CheckInResultResponse): string {
  const t = useTranslations("CheckIns.overlay.message");
  if (data.result === "Allowed") return data.daysLeft === 0 ? t("lastDay") : t("allowed");
  return data.denyReason ? t(data.denyReason) : "";
}

function ResultDetails({ data }: { data: CheckInResultResponse }) {
  const t = useTranslations("CheckIns.overlay");
  const tReason = useTranslations("Enums.CheckInDenyReason");
  const f = useFormat();
  const message = useResultMessage(data);
  const allowed = data.result === "Allowed";
  const daysLeft = data.daysLeft;

  return (
    <>
      <MemberAvatar
        name={data.memberName}
        photoUrl={data.photoUrl}
        className="size-28 ring-4 ring-white/40 sm:size-36"
        fallbackClassName="bg-white/20 text-3xl text-white sm:text-4xl"
      />
      <div className="space-y-2">
        {/* Letter spacing breaks the joined Arabic letters, so it's turned off in RTL. */}
        <p className="text-sm font-semibold tracking-[0.2em] text-white/80 uppercase rtl:tracking-normal">
          {allowed ? t("welcome") : t("denied")}
        </p>
        <h2 id="check-in-result-title" className="text-4xl font-bold tracking-tight sm:text-6xl">
          <bdi>{data.memberName}</bdi>
        </h2>
        {!allowed && data.denyReason && (
          <p className="text-2xl font-semibold sm:text-3xl">{tReason(data.denyReason)}</p>
        )}
        {message && <p className="mx-auto max-w-xl text-lg text-white/85">{message}</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {data.planName && (
          <Chip icon={IdCard}>
            <bdi>{data.planName}</bdi>
          </Chip>
        )}
        {allowed && daysLeft !== null && (
          <Chip icon={Hourglass}>
            {daysLeft === 0 ? t("lastDayChip") : t("daysLeft", { count: daysLeft })}
          </Chip>
        )}
        {allowed && data.coveredUntil && (
          <Chip icon={CalendarCheck}>{t("coveredUntil", { date: f.date(data.coveredUntil) })}</Chip>
        )}
        <Chip icon={Check}>{t("scannedAt", { time: f.time(data.checkedInAt) })}</Chip>
      </div>
      {allowed && daysLeft !== null && daysLeft <= 7 && (
        <p className="rounded-lg bg-black/20 px-4 py-2 text-sm font-medium">{t("renewalSoon")}</p>
      )}
    </>
  );
}

/**
 * The full-screen green / red answer after a scan, readable from across the reception.
 * Closes by itself after a few seconds, on click, or with Esc. The bar at the bottom shows
 * how long until it closes.
 */
export function CheckInResultOverlay({
  outcome,
  onClose,
}: {
  outcome: CheckInOutcome | null;
  onClose: () => void;
}) {
  const t = useTranslations("CheckIns.overlay");
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!outcome) return;
    const timer = setTimeout(onClose, RESULT_SECONDS * 1000);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [outcome, onClose]);

  const allowed = outcome?.kind === "result" && outcome.data.result === "Allowed";

  return (
    <AnimatePresence>
      {outcome && (
        <motion.div
          key={outcome.id}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="check-in-result-title"
          aria-live="assertive"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className={cn(
            "fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center overflow-y-auto p-6 text-center text-white",
            allowed ? "bg-emerald-600" : "bg-red-600",
          )}
          data-testid="check-in-result"
          data-result={allowed ? "allowed" : outcome.kind === "unknown" ? "unknown" : "denied"}
        >
          {/* Soft light behind the content, so the color doesn't feel flat. */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.22),transparent_60%)]" />

          <motion.div
            initial={reduceMotion ? false : { scale: 0.92, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="relative flex flex-col items-center gap-6"
          >
            <motion.span
              initial={reduceMotion ? false : { scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 16, delay: 0.05 }}
              className="flex size-16 items-center justify-center rounded-full bg-white text-emerald-600 shadow-xl sm:size-20"
            >
              {allowed ? (
                <Check className="size-9 stroke-[3] sm:size-11" />
              ) : (
                <X className="size-9 stroke-[3] text-red-600 sm:size-11" />
              )}
            </motion.span>

            {outcome.kind === "result" ? (
              <ResultDetails data={outcome.data} />
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-semibold tracking-[0.2em] text-white/80 uppercase rtl:tracking-normal">
                  {t("denied")}
                </p>
                <h2 id="check-in-result-title" className="text-4xl font-bold sm:text-5xl">
                  {t("unknownTitle")}
                </h2>
                <p className="mx-auto max-w-lg text-lg text-white/85">{t("unknownText")}</p>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                variant="secondary"
                className="bg-white text-zinc-900 hover:bg-white/90"
                onClick={(event) => {
                  event.stopPropagation();
                  onClose();
                }}
              >
                {t("next")}
              </Button>
              {outcome.kind === "result" && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <Link
                    href={`/dashboard/members/${outcome.data.memberId}`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <UserRound /> {t("openProfile")}
                  </Link>
                </Button>
              )}
            </div>
            <p className="text-sm text-white/70">{t("dismiss")}</p>
          </motion.div>

          {/* The countdown bar shrinks toward the start side (left in English, right in Arabic). */}
          <motion.div
            className="absolute start-0 bottom-0 h-1.5 bg-white/70"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: RESULT_SECONDS, ease: "linear" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
