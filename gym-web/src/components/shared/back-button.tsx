"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

/** Goes back one page; if the visitor opened this page directly, it goes to the home page. */
export function BackButton({ label }: { label: string }) {
  const router = useRouter();

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  };

  return (
    <Button variant="outline" onClick={goBack}>
      <ArrowLeft className="rtl:rotate-180" aria-hidden /> {label}
    </Button>
  );
}
