"use client";

import { useCallback, useRef, useState } from "react";
import {
  ArrowRight,
  History,
  Keyboard,
  Loader2,
  LogIn,
  ShieldX,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-error";
import {
  CheckInResultBadge,
  DENY_REASON_LABEL,
} from "@/features/check-ins/components/check-in-badges";
import {
  CheckInResultOverlay,
  type CheckInOutcome,
} from "@/features/check-ins/components/check-in-result-overlay";
import { QrScanner } from "@/features/check-ins/components/qr-scanner";
import { useCheckIn, useCheckIns } from "@/features/check-ins/queries";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { ApiError } from "@/lib/api-error";
import { cairoToday } from "@/lib/cairo-time";
import { formatTime } from "@/lib/format";
import { toastError } from "@/lib/notify";
import { playCue } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

/** Member QR codes are 32 hexadecimal characters (see CheckInCodes on the API). */
const CODE_PATTERN = /^[0-9a-f]{32}$/;
/** The same code seen again within this time is the member still holding the phone up. */
const SAME_CODE_COOLDOWN_MS = 8_000;
const SOUND_PREF_KEY = "pf-checkin-sound";

function readSoundPref(): boolean {
  try {
    return localStorage.getItem(SOUND_PREF_KEY) !== "off";
  } catch {
    return true;
  }
}

/** One number in the "Today" strip. */
function TodayStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | undefined;
  tone: "success" | "destructive" | "muted";
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {value === undefined ? (
        <Skeleton className="mt-2 h-7 w-12" />
      ) : (
        <p
          className={cn(
            "mt-1 text-2xl font-bold tabular-nums",
            tone === "success" && "text-success",
            tone === "destructive" && "text-destructive",
          )}
        >
          {value}
        </p>
      )}
    </div>
  );
}

/** The latest scans of today, refreshed every 30 seconds (another desk may be scanning too). */
function RecentScans({ today }: { today: string }) {
  const filters = { from: today, to: today, memberId: null };
  const recent = useCheckIns({ ...filters, result: null, page: 1, pageSize: 8 }, { live: true });
  const allowed = useCheckIns(
    { ...filters, result: "Allowed", page: 1, pageSize: 1 },
    { live: true },
  );
  const denied = useCheckIns(
    { ...filters, result: "Denied", page: 1, pageSize: 1 },
    { live: true },
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today at the door</CardTitle>
        <CardDescription>Live, updates every 30 seconds and after each scan.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <TodayStat label="Let in" value={allowed.data?.totalCount} tone="success" />
          <TodayStat label="Turned away" value={denied.data?.totalCount} tone="destructive" />
          <TodayStat label="Total scans" value={recent.data?.totalCount} tone="muted" />
        </div>

        {recent.isError ? (
          <QueryError
            title="We couldn't load today's scans"
            error={recent.error}
            onRetry={() => void recent.refetch()}
            retrying={recent.isFetching}
          />
        ) : recent.isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : recent.data.items.length === 0 ? (
          <EmptyState
            icon={LogIn}
            title="No scans yet today"
            description="The first member through the door will show up here."
          />
        ) : (
          <ul className="divide-y" aria-label="Recent scans">
            {recent.data.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-2.5">
                <MemberAvatar name={item.memberName} photoUrl={null} className="size-8 text-xs" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/dashboard/members/${item.memberId}`}
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {item.memberName}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatTime(item.checkedInAt)}
                    {item.denyReason && ` · ${DENY_REASON_LABEL[item.denyReason]}`}
                  </p>
                </div>
                <CheckInResultBadge result={item.result} />
              </li>
            ))}
          </ul>
        )}

        <Button variant="outline" className="w-full" asChild>
          <Link href="/dashboard/check-ins">
            Full attendance log <ArrowRight className="rtl:rotate-180" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * /dashboard/check-in: the reception screen. Scan with the camera (or a USB scanner / typed code),
 * get a big green or red answer, and see today's traffic on the side.
 */
export function CheckInDesk() {
  const checkIn = useCheckIn();
  const { mutateAsync, isPending } = checkIn;
  const [outcome, setOutcome] = useState<CheckInOutcome | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [sound, setSound] = useState(readSoundPref);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastScan = useRef<{ code: string; at: number } | null>(null);
  const outcomeRef = useRef<CheckInOutcome | null>(null);

  const show = useCallback(
    (next: CheckInOutcome | null) => {
      outcomeRef.current = next;
      setOutcome(next);
      if (next && sound) {
        playCue(next.kind === "result" && next.data.result === "Allowed" ? "ok" : "error");
      }
    },
    [sound],
  );

  /** Sends a code to the API and shows the answer. Used by the camera and the code box. */
  const submit = useCallback(
    async (raw: string, source: "camera" | "manual") => {
      const value = raw.trim().toLowerCase();
      const now = Date.now();

      if (source === "camera") {
        const last = lastScan.current;
        if (last && last.code === value && now - last.at < SAME_CODE_COOLDOWN_MS) return;
      }
      lastScan.current = { code: value, at: now };

      // A QR that isn't a member code (a menu, a website...) can't belong to anyone: no need to ask the API.
      if (!CODE_PATTERN.test(value)) {
        show({ kind: "unknown", id: now });
        return;
      }

      try {
        const data = await mutateAsync(value);
        show({ kind: "result", id: data.checkInId, data });
        setCode("");
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          show({ kind: "unknown", id: now });
        } else {
          toastError("We couldn't check this member in", error);
        }
      }
    },
    [mutateAsync, show],
  );

  const onCameraScan = useCallback(
    (text: string) => {
      if (outcomeRef.current) return;
      void submit(text, "camera");
    },
    [submit],
  );

  const closeResult = useCallback(() => {
    show(null);
    // Ready for the next member: a USB scanner types into the focused box.
    inputRef.current?.focus();
  }, [show]);

  const onManualSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = code.trim().toLowerCase();
    if (!value) {
      setCodeError("Enter the member's check-in code.");
      return;
    }
    if (!CODE_PATTERN.test(value)) {
      setCodeError("A check-in code has 32 characters: the digits 0–9 and the letters a–f.");
      return;
    }
    setCodeError(null);
    void submit(value, "manual");
  };

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    try {
      localStorage.setItem(SOUND_PREF_KEY, next ? "on" : "off");
    } catch {
      // Not remembered, but still works for this visit.
    }
    if (next) playCue("ok");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Check-in desk"
        description="Scan a member's QR code to let them in. Every scan is logged, including refused ones."
        actions={
          <>
            <Button
              variant="outline"
              onClick={toggleSound}
              aria-pressed={sound}
              aria-label={sound ? "Turn sound off" : "Turn sound on"}
            >
              {sound ? <Volume2 /> : <VolumeX />}
              {sound ? "Sound on" : "Sound off"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/check-ins">
                <History /> Attendance log
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Scanner</CardTitle>
            <CardDescription>
              Members open their QR code in the member app and hold it up to the camera.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <QrScanner paused={outcome !== null} busy={isPending} onScan={onCameraScan} />

            <div className="flex items-center gap-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <span className="h-px flex-1 bg-border" />
              or enter the code
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={onManualSubmit} noValidate className="space-y-2">
              <label
                htmlFor="check-in-code"
                className="flex items-center gap-2 text-sm font-medium"
              >
                <Keyboard className="size-4 text-muted-foreground" /> Check-in code
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="check-in-code"
                  ref={inputRef}
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value);
                    if (codeError) setCodeError(null);
                  }}
                  placeholder="e.g. 3f9a1c0b7d2e4f6a8b1c3d5e7f9a0b2c"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={64}
                  aria-invalid={codeError ? true : undefined}
                  aria-describedby="check-in-code-help"
                  className="font-mono sm:flex-1"
                />
                <Button type="submit" disabled={isPending} className="sm:w-36">
                  {isPending ? <Loader2 className="animate-spin" /> : <LogIn />}
                  Check in
                </Button>
              </div>
              <p
                id="check-in-code-help"
                className={cn("text-xs", codeError ? "text-destructive" : "text-muted-foreground")}
                role={codeError ? "alert" : undefined}
              >
                {codeError ??
                  "Shown under the member's QR code. USB barcode scanners can type into this box too."}
              </p>
            </form>

            <div className="flex items-start gap-3 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
              <ShieldX className="mt-0.5 size-4 shrink-0" />
              <p>
                Members are let in once per day with a running, unfrozen membership. Expired, frozen
                and not-yet-started memberships are refused with the reason on screen.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <RecentScans today={cairoToday()} />
        </div>
      </div>

      <CheckInResultOverlay outcome={outcome} onClose={closeResult} />
    </div>
  );
}
