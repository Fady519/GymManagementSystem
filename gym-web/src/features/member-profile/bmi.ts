export type BmiCategory = "under" | "normal" | "over" | "obese";

/**
 * Body-mass index from the form's text boxes: weight (kg) / height (m)².
 * Returns null until both boxes hold a sensible number, so the hint never shows nonsense
 * while the member is still typing (e.g. height "1" on the way to "175").
 */
export function bmiOf(
  heightText: string,
  weightText: string,
): { value: number; category: BmiCategory } | null {
  if (!heightText.trim() || !weightText.trim()) return null;
  const height = Number(heightText);
  const weight = Number(weightText);
  // Same ranges as the form rules.
  if (!(height >= 50 && height <= 250 && weight >= 20 && weight <= 300)) return null;

  const value = Math.round((weight / (height / 100) ** 2) * 10) / 10;
  // The WHO adult categories.
  const category: BmiCategory =
    value < 18.5 ? "under" : value < 25 ? "normal" : value < 30 ? "over" : "obese";
  return { value, category };
}
