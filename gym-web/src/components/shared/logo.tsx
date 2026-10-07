import Image from "next/image";
import Link from "next/link";

/** The Power Fitness logo + name. Links to the home page. */
export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Power Fitness home">
      <Image
        src="/images/logo.jpg"
        alt=""
        width={44}
        height={44}
        className="rounded-md bg-white p-0.5"
        priority
      />
      <span className="text-lg font-extrabold tracking-tight text-primary uppercase">
        Power Fitness
      </span>
    </Link>
  );
}
