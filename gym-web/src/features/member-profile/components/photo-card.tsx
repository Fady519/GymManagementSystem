"use client";

import { useId, useState } from "react";
import { Camera, ImageUp, Loader2, Trash2, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/features/member-profile/components/profile-avatar";
import { ProfileSection } from "@/features/member-profile/components/profile-section";
import { useDeleteMyPhoto, useUploadMyPhoto } from "@/features/member-profile/queries";
import { photoProblem, PHOTO_TYPES } from "@/features/member-profile/schemas";
import { errorMessage } from "@/features/member-profile/server-errors";
import { useFormat } from "@/hooks/use-format";
import { cn } from "@/lib/utils";
import type { MemberResponse } from "@/types";

/** The picked file plus a preview the <img> can show right away (a data: URL). */
type PickedPhoto = { file: File; preview: string };

/**
 * Pick a photo (click or drag & drop), check it, preview it, then upload it with one click.
 * Nothing is sent until "Upload photo", so a wrong pick costs nothing.
 */
export function PhotoCard({ profile }: { profile: MemberResponse }) {
  const t = useTranslations("MemberProfile.photo");
  const tErrors = useTranslations("MemberProfile.errors");
  const tCommon = useTranslations("Common");
  const f = useFormat();
  const inputId = useId();
  const upload = useUploadMyPhoto();
  const remove = useDeleteMyPhoto();

  const [picked, setPicked] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pick = (file: File | undefined) => {
    if (!file) return;
    const problem = photoProblem(file, tErrors);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    // A data: URL instead of URL.createObjectURL: there's no object URL to clean up later.
    const reader = new FileReader();
    reader.onload = () => setPicked({ file, preview: String(reader.result) });
    reader.onerror = () => setError(tErrors("photoRead"));
    reader.readAsDataURL(file);
  };

  const onUpload = async () => {
    if (!picked) return;
    try {
      await upload.mutateAsync(picked.file);
      setPicked(null);
      toast.success(t("uploaded"), { description: t("uploadedBody") });
    } catch (err) {
      toast.error(t("uploadError"), { description: errorMessage(err, tErrors) });
    }
  };

  const onRemove = async () => {
    try {
      await remove.mutateAsync();
      toast.success(t("removed"));
    } catch (err) {
      toast.error(t("removeError"), { description: errorMessage(err, tErrors) });
    } finally {
      // Closed on failure too: clicking the same button again wouldn't fix the error.
      setConfirmOpen(false);
    }
  };

  const size = (bytes: number) =>
    bytes < 1024 * 1024
      ? t("sizeKb", { value: f.number(Math.round(bytes / 1024)) })
      : t("sizeMb", { value: f.number(Math.round((bytes / 1024 / 1024) * 10) / 10) });

  const busy = upload.isPending || remove.isPending;

  return (
    <ProfileSection icon={<Camera />} title={t("title")} description={t("hint")}>
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
          "flex flex-col items-center gap-4 rounded-xl border-2 border-dashed p-5 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border",
          error && "border-destructive/60",
        )}
      >
        {picked ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local data: preview, next/image can't optimize it
          <img
            src={picked.preview}
            alt={t("previewAlt")}
            className="size-28 rounded-full object-cover ring-4 ring-primary/20"
          />
        ) : (
          <ProfileAvatar
            name={profile.name}
            photoUrl={profile.photoUrl}
            className="size-28 ring-4 ring-primary/10"
          />
        )}

        <div className="grid gap-1">
          {picked ? (
            <>
              <p className="font-medium break-all">{picked.file.name}</p>
              <p className="text-sm text-muted-foreground">
                {size(picked.file.size)} · {t("previewNote")}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("rules")}</p>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {picked ? (
            <>
              <Button type="button" onClick={onUpload} disabled={busy}>
                {upload.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
                {upload.isPending ? t("uploading") : t("upload")}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setPicked(null)} disabled={busy}>
                <X /> {tCommon("cancel")}
              </Button>
            </>
          ) : (
            <>
              {/* A <label> styled as a button opens the file input; the input is only visually hidden, so it still gets keyboard focus. */}
              <Button variant="outline" asChild>
                <label htmlFor={inputId} className="cursor-pointer">
                  <ImageUp /> {profile.photoUrl ? t("change") : t("choose")}
                </label>
              </Button>
              {profile.photoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmOpen(true)}
                  disabled={busy}
                >
                  <Trash2 /> {t("remove")}
                </Button>
              )}
            </>
          )}
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

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => !remove.isPending && setConfirmOpen(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("removeBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>{tCommon("cancel")}</AlertDialogCancel>
            {/* A plain Button (not AlertDialogAction) so the dialog stays open until the request ends. */}
            <Button variant="destructive" onClick={onRemove} disabled={remove.isPending}>
              {remove.isPending && <Loader2 className="animate-spin" />}
              {t("removeConfirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProfileSection>
  );
}
