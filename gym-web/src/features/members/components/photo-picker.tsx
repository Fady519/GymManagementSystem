"use client";

import { useId, useState } from "react";
import { Camera, ImageUp, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PHOTO_TYPES, photoProblem } from "@/features/members/schemas";
import { useFormat } from "@/hooks/use-format";
import { cn } from "@/lib/utils";

/** The picked file plus a preview the <img> can show right away (a data: URL). */
export type PickedPhoto = { file: File; preview: string };

type PhotoPickerProps = {
  value: PickedPhoto | null;
  onChange: (value: PickedPhoto | null) => void;
};

/**
 * Pick a photo (click or drag & drop), check it, and preview it before anything is uploaded.
 * The preview is read into a data: URL with FileReader, so there's no object URL to clean up.
 */
export function PhotoPicker({ value, onChange }: PhotoPickerProps) {
  const t = useTranslations("Members.photo");
  const tErrors = useTranslations("Members.errors");
  const f = useFormat();
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // "350 KB" / "1.4 MB", with the digits of the UI language.
  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? t("sizeKb", { value: f.number(Math.round(bytes / 1024)) })
      : t("sizeMb", { value: f.number(Math.round((bytes / 1024 / 1024) * 10) / 10) });

  const pick = (file: File | undefined) => {
    if (!file) return;
    const problem = photoProblem(file, tErrors);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => onChange({ file, preview: String(reader.result) });
    reader.onerror = () => setError(tErrors("photoRead"));
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid gap-2">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          pick(event.dataTransfer.files[0]);
        }}
        className={cn(
          "flex flex-col items-center gap-4 rounded-xl border-2 border-dashed p-6 text-center transition-colors sm:flex-row sm:text-start",
          dragging ? "border-primary bg-primary/5" : "border-border",
          error && "border-destructive/60",
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local data: preview, next/image can't optimize it
          <img
            src={value.preview}
            alt={t("previewAlt")}
            className="size-28 shrink-0 rounded-full object-cover ring-4 ring-primary/15"
          />
        ) : (
          <div className="flex size-28 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Camera className="size-9" />
          </div>
        )}

        <div className="grid flex-1 gap-1">
          {value ? (
            <>
              {/* The file name is the user's own text: keep its direction. */}
              <p dir="auto" className="font-medium break-all">
                {value.file.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("pickedHint", { size: formatSize(value.file.size) })}
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">{t("title")}</p>
              <p className="text-sm text-muted-foreground">{t("rules")}</p>
            </>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Button variant="outline" size="sm" asChild>
              <label htmlFor={inputId} className="cursor-pointer">
                <ImageUp /> {value ? t("change") : t("choose")}
              </label>
            </Button>
            {value && (
              // type="button": inside a form, a button without a type would submit the form.
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
                <Trash2 /> {t("remove")}
              </Button>
            )}
          </div>
        </div>

        <input
          id={inputId}
          type="file"
          accept={PHOTO_TYPES.join(",")}
          className="sr-only"
          onChange={(event) => {
            pick(event.target.files?.[0]);
            // Reset so picking the same file again still fires onChange.
            event.target.value = "";
          }}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
