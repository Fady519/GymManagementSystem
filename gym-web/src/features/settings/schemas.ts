import type { useTranslations } from "next-intl";
import { z } from "zod";
import { EMAIL_MAX } from "@/lib/validation";
import type { GymSettingsResponse, UpdateGymSettingsRequest } from "@/types";

type ErrorText = ReturnType<typeof useTranslations<"GymSettings.errors">>;

// Same limits and rules as GymSettingsRules / UpdateGymSettingsRequestValidator in the API.
export const GYM_NAME_MAX = 100;
export const ADDRESS_MAX = 200;
export const MAP_URL_MAX = 500;
export const SOCIAL_URL_MAX = 300;
const PHONE_PATTERN = /^[0-9+\- ]{7,20}$/;

const isHttpsUrl = (value: string) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * The settings form rules, with messages in the current language (pass the "GymSettings.errors"
 * translator). Values stay strings, as the inputs give them; toRequest() converts them for the API.
 */
export function gymSettingsSchema(t: ErrorText) {
  const required = (max: number) =>
    z.string().trim().min(1, t("required")).max(max, t("max", { max }));

  const optionalLink = (max: number) =>
    z
      .string()
      .trim()
      .max(max, t("max", { max }))
      .refine((v) => v === "" || isHttpsUrl(v), t("https"));

  const phone = z.string().trim().regex(PHONE_PATTERN, t("phone"));

  return z
    .object({
      gymName: required(GYM_NAME_MAX),
      phone,
      whatsApp: z
        .string()
        .trim()
        .refine((v) => v === "" || PHONE_PATTERN.test(v), t("phone")),
      email: required(EMAIL_MAX).pipe(z.email(t("email"))),
      addressEn: required(ADDRESS_MAX),
      addressAr: required(ADDRESS_MAX),
      mapUrl: optionalLink(MAP_URL_MAX),
      facebookUrl: optionalLink(SOCIAL_URL_MAX),
      instagramUrl: optionalLink(SOCIAL_URL_MAX),
      weekdayOpensAt: z.string().min(1, t("time")),
      weekdayClosesAt: z.string().min(1, t("time")),
      fridayOpen: z.boolean(),
      fridayOpensAt: z.string(),
      fridayClosesAt: z.string(),
    })
    .superRefine((v, ctx) => {
      // "HH:mm" strings compare correctly as text ("09:00" < "21:00").
      if (v.weekdayOpensAt && v.weekdayClosesAt && v.weekdayClosesAt <= v.weekdayOpensAt) {
        ctx.addIssue({ code: "custom", path: ["weekdayClosesAt"], message: t("closeAfterOpen") });
      }
      if (!v.fridayOpen) return;
      if (!v.fridayOpensAt)
        ctx.addIssue({ code: "custom", path: ["fridayOpensAt"], message: t("time") });
      if (!v.fridayClosesAt)
        ctx.addIssue({ code: "custom", path: ["fridayClosesAt"], message: t("time") });
      if (v.fridayOpensAt && v.fridayClosesAt && v.fridayClosesAt <= v.fridayOpensAt) {
        ctx.addIssue({ code: "custom", path: ["fridayClosesAt"], message: t("closeAfterOpen") });
      }
    });
}

export type GymSettingsValues = z.infer<ReturnType<typeof gymSettingsSchema>>;

/** "06:00:00" -> "06:00" for <input type="time">. */
const hhmm = (time: string | null) => (time ? time.slice(0, 5) : "");

/** Form values from the API response (null becomes an empty box). */
export function toFormValues(s: GymSettingsResponse): GymSettingsValues {
  return {
    gymName: s.gymName,
    phone: s.phone,
    whatsApp: s.whatsApp ?? "",
    email: s.email,
    addressEn: s.addressEn,
    addressAr: s.addressAr,
    mapUrl: s.mapUrl ?? "",
    facebookUrl: s.facebookUrl ?? "",
    instagramUrl: s.instagramUrl ?? "",
    weekdayOpensAt: hhmm(s.weekdayOpensAt),
    weekdayClosesAt: hhmm(s.weekdayClosesAt),
    fridayOpen: s.fridayOpensAt !== null && s.fridayClosesAt !== null,
    fridayOpensAt: hhmm(s.fridayOpensAt) || "14:00",
    fridayClosesAt: hhmm(s.fridayClosesAt) || "22:00",
  };
}

/** The API request from the form values: times get seconds, a closed Friday sends nulls. */
export function toRequest(v: GymSettingsValues): UpdateGymSettingsRequest {
  const time = (t: string) => `${t}:00`;
  return {
    gymName: v.gymName,
    phone: v.phone,
    whatsApp: v.whatsApp || null,
    email: v.email,
    addressEn: v.addressEn,
    addressAr: v.addressAr,
    mapUrl: v.mapUrl || null,
    facebookUrl: v.facebookUrl || null,
    instagramUrl: v.instagramUrl || null,
    weekdayOpensAt: time(v.weekdayOpensAt),
    weekdayClosesAt: time(v.weekdayClosesAt),
    fridayOpensAt: v.fridayOpen ? time(v.fridayOpensAt) : null,
    fridayClosesAt: v.fridayOpen ? time(v.fridayClosesAt) : null,
  };
}
