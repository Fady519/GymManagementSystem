"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, CameraOff, Loader2, ScanLine, TriangleAlert } from "lucide-react";
import type { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Remembered between visits: if the camera was on last time, it starts by itself. */
const CAMERA_PREF_KEY = "pf-checkin-camera";

type Status = "idle" | "starting" | "running" | "error";

/** The browser's camera errors -> a sentence the reception staff can act on. */
function cameraErrorMessage(error: unknown): string {
  const text = String(error instanceof Error ? `${error.name} ${error.message}` : error);
  if (typeof navigator !== "undefined" && !navigator.mediaDevices) {
    return "The camera only works on a secure (HTTPS) connection. Use the code box instead.";
  }
  if (/NotAllowed|Permission/i.test(text)) {
    return "Camera access is blocked. Allow the camera in your browser's site settings, then try again.";
  }
  if (/NotFound|Requested device|no camera/i.test(text)) {
    return "No camera was found on this device. Connect one, or use the code box below.";
  }
  if (/NotReadable|in use|Could not start/i.test(text)) {
    return "The camera is being used by another app. Close it, then try again.";
  }
  return "The camera couldn't start. Try again, or use the code box below.";
}

function readPref(): boolean {
  try {
    return localStorage.getItem(CAMERA_PREF_KEY) === "on";
  } catch {
    return false;
  }
}

function writePref(on: boolean) {
  try {
    localStorage.setItem(CAMERA_PREF_KEY, on ? "on" : "off");
  } catch {
    // Private mode etc.: the preference just isn't remembered.
  }
}

/**
 * The live camera view that reads QR codes (html5-qrcode).
 * - The library (~100 KB) is downloaded only when the camera starts, not with the page.
 * - While `paused` is true (a result is on screen), codes are ignored instead of re-sent.
 * - Start/stop calls are queued one after the other: the library throws if a start
 *   begins while a stop is still running (this happens with fast clicks or React's dev double-mount).
 */
export function QrScanner({
  paused,
  busy,
  onScan,
}: {
  paused: boolean;
  /** Shows a "Checking…" layer while the API answers. */
  busy: boolean;
  onScan: (text: string) => void;
}) {
  // useId gives something like "«r3»": keep only characters that are valid in an element id.
  const regionId = `qr-region-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [status, setStatus] = useState<Status>(() => (readPref() ? "starting" : "idle"));
  const [error, setError] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  // Refs so the camera callback (created once) always sees the latest props.
  const onScanRef = useRef(onScan);
  const pausedRef = useRef(paused);
  useEffect(() => {
    onScanRef.current = onScan;
    pausedRef.current = paused || busy;
  });

  const enqueue = useCallback((task: () => Promise<void>) => {
    queueRef.current = queueRef.current.then(task).catch(() => undefined);
    return queueRef.current;
  }, []);

  const stopCamera = useCallback(
    () =>
      enqueue(async () => {
        const scanner = scannerRef.current;
        scannerRef.current = null;
        if (!scanner) return;
        if (scanner.isScanning) await scanner.stop();
        scanner.clear();
        // Also covers "Stop" pressed while the camera was still starting.
        setStatus("idle");
      }),
    [enqueue],
  );

  const startCamera = useCallback(
    () =>
      enqueue(async () => {
        if (scannerRef.current?.isScanning) return;
        try {
          const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
          const scanner = new Html5Qrcode(regionId, {
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            // Use the browser's built-in fast detector when it has one (Chrome / Edge).
            useBarCodeDetectorIfSupported: true,
            verbose: false,
          });
          scannerRef.current = scanner;
          await scanner.start(
            // "environment" = the back camera on phones/tablets; laptops fall back to the webcam.
            { facingMode: "environment" },
            { fps: 12, aspectRatio: 4 / 3 },
            (text) => {
              if (!pausedRef.current) onScanRef.current(text);
            },
            // Called for every frame without a QR in it: nothing to do.
            () => undefined,
          );
          setError(null);
          setStatus("running");
          writePref(true);
        } catch (err) {
          try {
            scannerRef.current?.clear();
          } catch {
            // Nothing was drawn yet: nothing to clean up.
          }
          scannerRef.current = null;
          setError(cameraErrorMessage(err));
          setStatus("error");
          writePref(false);
        }
      }),
    [enqueue, regionId],
  );

  // Start by itself if the camera was on last time, and always release the camera when leaving.
  useEffect(() => {
    if (readPref()) void startCamera();
    return () => void stopCamera();
  }, [startCamera, stopCamera]);

  const turnOn = () => {
    setStatus("starting");
    setError(null);
    void startCamera();
  };

  const turnOff = () => {
    writePref(false);
    setStatus("idle");
    void stopCamera();
  };

  const running = status === "running";

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-zinc-950">
        {/* html5-qrcode puts its <video> inside this element. */}
        <div
          id={regionId}
          className="absolute inset-0 [&_video]:size-full! [&_video]:object-cover"
          aria-hidden
        />

        {running && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {/* Corner brackets + a moving line: shows where to hold the code. */}
            <div className="relative size-[62%] max-h-72 max-w-72">
              {[
                "top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl",
                "top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl",
                "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl",
                "bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl",
              ].map((corner) => (
                <span key={corner} className={cn("absolute size-10 border-white/90", corner)} />
              ))}
              <motion.span
                className="absolute inset-x-3 h-0.5 rounded-full bg-primary shadow-[0_0_16px_4px] shadow-primary/60"
                animate={{ top: ["8%", "92%", "8%"] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <p className="absolute bottom-3 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              {paused
                ? "Paused while the result is shown"
                : "Hold the member's QR code inside the frame"}
            </p>
          </div>
        )}

        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-zinc-300">
            {status === "starting" ? (
              <>
                <Loader2 className="size-10 animate-spin text-white" />
                <p className="text-sm">Starting the camera… allow access if your browser asks.</p>
              </>
            ) : status === "error" ? (
              <>
                <span className="flex size-14 items-center justify-center rounded-full bg-amber-500/15">
                  <TriangleAlert className="size-7 text-amber-400" />
                </span>
                <p className="max-w-sm text-sm" role="alert">
                  {error}
                </p>
                <Button onClick={turnOn} variant="secondary">
                  <Camera /> Try again
                </Button>
              </>
            ) : (
              <>
                <span className="flex size-16 items-center justify-center rounded-2xl bg-white/10">
                  <ScanLine className="size-8 text-white" />
                </span>
                <div className="space-y-1">
                  <p className="font-semibold text-white">Ready when you are</p>
                  <p className="max-w-xs text-sm">
                    Turn on the camera and members can scan the QR code from their app.
                  </p>
                </div>
                <Button onClick={turnOn}>
                  <Camera /> Start camera
                </Button>
              </>
            )}
          </div>
        )}

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-900">
              <Loader2 className="size-4 animate-spin" /> Checking…
            </span>
          </div>
        )}
      </div>

      {running && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-success" />
            </span>
            Camera on, scanning
          </span>
          <Button variant="ghost" size="sm" onClick={turnOff}>
            <CameraOff /> Stop camera
          </Button>
        </div>
      )}
    </div>
  );
}
