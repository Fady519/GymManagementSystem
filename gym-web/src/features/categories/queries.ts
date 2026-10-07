import { useQuery } from "@tanstack/react-query";
import { getCategories } from "@/features/categories/api";

export const categoryKeys = {
  all: ["categories"] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: getCategories,
  });
}
