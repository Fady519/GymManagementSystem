import { apiClient } from "@/lib/api-client";
import type { ExportFormat } from "@/types";

/** The lists the API can export (GET /api/exports/{name}). */
export type ExportName = "members" | "memberships" | "payments" | "check-ins";

type ParamValue = string | number | boolean | null | undefined;

/**
 * Reads the file name from the Content-Disposition header the API sends, e.g.
 *   attachment; filename=members-2026-10-08.xlsx; filename*=UTF-8''members-2026-10-08.xlsx
 * filename* (the UTF-8 version) wins when both are there.
 */
export function fileNameFromHeader(header: string | undefined): string | null {
  if (!header) return null;
  const utf8 = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (utf8) return decodeURIComponent(utf8[1].trim());
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
  return plain ? plain[1].trim() : null;
}

/**
 * Downloads an export with the current page's filters and saves it in the browser.
 * We can't use a plain <a href> because the API needs the access token in a header:
 * so we fetch the file through apiClient (token + silent refresh), get it as a Blob,
 * and click a temporary link that points at that Blob. Returns the saved file name.
 */
export async function downloadExport(
  name: ExportName,
  filters: Record<string, ParamValue>,
  format: ExportFormat,
): Promise<string> {
  // Drop empty filters so the API uses its defaults for them.
  const params: Record<string, string | number | boolean> = { format };
  for (const [key, value] of Object.entries(filters)) {
    if (value !== null && value !== undefined && value !== "") params[key] = value;
  }

  const response = await apiClient.get<Blob>(`/api/exports/${name}`, {
    params,
    responseType: "blob",
  });

  const extension = format === "Csv" ? "csv" : "xlsx";
  const fileName =
    fileNameFromHeader(response.headers["content-disposition"] as string | undefined) ??
    `${name}.${extension}`;

  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before freeing the memory.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);

  return fileName;
}
