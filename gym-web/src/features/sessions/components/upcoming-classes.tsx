"use client";

import { Clock, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/components/shared/query-error";
import { useUpcomingSessions } from "@/features/sessions/queries";
import { formatClassTime } from "@/lib/format";

/** The next three classes on the schedule (GET /api/sessions?state=Upcoming), in Cairo time. */
export function UpcomingClasses() {
  const { data, isPending, isError, error, refetch, isFetching } = useUpcomingSessions(3);

  if (isPending) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <QueryError
        title="We couldn't load the schedule"
        error={error}
        onRetry={refetch}
        retrying={isFetching}
      />
    );
  }

  if (data.items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
        Next week&apos;s schedule is being prepared. Check back soon.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {data.items.map((session) => {
        const full = session.availableSlots === 0;
        const almostFull = !full && session.availableSlots <= 3;

        return (
          <Card key={session.id} className="rounded-2xl transition-shadow hover:shadow-md">
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary">{session.categoryName}</Badge>
                <span
                  className={
                    full
                      ? "text-sm font-medium text-destructive"
                      : almostFull
                        ? "text-sm font-medium text-warning"
                        : "text-sm text-muted-foreground"
                  }
                >
                  {full
                    ? "Fully booked"
                    : `${session.availableSlots} of ${session.capacity} spots left`}
                </span>
              </div>
              <p className="line-clamp-2 font-semibold">{session.description}</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Clock className="size-4" /> {formatClassTime(session.startDate)}
                </p>
                <p className="flex items-center gap-2">
                  <UserRound className="size-4" /> Coach {session.trainerName}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
