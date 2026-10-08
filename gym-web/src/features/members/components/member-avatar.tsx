import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";

/** A member's photo, or their initials when there is no photo (or it fails to load). */
export function MemberAvatar({
  name,
  photoUrl,
  className,
}: {
  name: string;
  photoUrl: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-9", className)}>
      {photoUrl && <AvatarImage src={photoUrl} alt={name} className="object-cover" />}
      <AvatarFallback className="bg-primary/10 font-semibold text-primary">
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  );
}
