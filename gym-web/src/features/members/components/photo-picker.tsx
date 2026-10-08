"use client";

import { useId, useState } from "react";
import { Camera, ImageUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PHOTO_TYPES, photoProblem } from "@/features/members/schemas";
import { cn } from "@/lib/utils";

/** The picked file plus a preview the <img> can show right away (a data: URL). */
export type PickedPhoto = { file: File; preview: string };

type PhotoPickerProps = {
  value: PickedPhoto | null;
  onChange: (value: PickedPhoto | null) => void;
};

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Pick a photo (click or drag & drop), check it, and preview it before anything is uploaded.
 * The preview is read into a data: URL with FileReader, so there's no object URL to clean up.
 */
export function PhotoPicker({ value, onChange }: PhotoPickerProps) {
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (file: File | undefined) => {
    if (!file) return;
    const problem = photoProblem(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => onChange({ file, preview: String(reader.result) });
    reader.onerror = () => setError("We couldn't read that file. Try another one.");
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
            alt="Preview of the member's photo"
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
              <p className="font-medium break-all">{value.file.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatSize(value.file.size)} · uploaded when you save
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">Add a profile photo</p>
              <p className="text-sm text-muted-foreground">
                Drag it here or choose a file. JPG, PNG or WEBP, up to 2 MB. Reception uses it to
                recognize members at check-in.
              </p>
            </>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Button variant="outline" size="sm" asChild>
              <label htmlFor={inputId} className="cursor-pointer">
                <ImageUp /> {value ? "Change photo" : "Choose photo"}
              </label>
            </Button>
            {value && (
              // type="button": inside a form, a button without a type would submit the form.
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
                <Trash2 /> Remove
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
