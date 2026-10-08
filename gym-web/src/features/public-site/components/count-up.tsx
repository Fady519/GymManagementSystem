"use client";

import { AnimatedNumber } from "@/components/shared/animated-number";
import { useFormat } from "@/hooks/use-format";

/** A number that counts up when the page opens, written in the site language (plain or money). */
export function CountUp({ value, money = false }: { value: number; money?: boolean }) {
  const f = useFormat();
  return <AnimatedNumber value={value} format={money ? f.money : (n) => f.number(Math.round(n))} />;
}
