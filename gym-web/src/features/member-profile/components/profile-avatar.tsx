import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The member's photo, or their initials when there is none (or it fails to load).
 * photoUrl is a "/uploads/..." path: next.config.ts forwards it to the API, so it works as is.
 */
export function ProfileAvatar({
  name,
  photoUrl,
  className,
}: {
  name: string;
  photoUrl: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-24", className)}>
      {photoUrl && <AvatarImage src={photoUrl} alt={name} className="object-cover" />}
      <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  );
}
