/** Links built from the contact details the admin saves in Gym settings. */

/** "+20 100 555 0199" -> "tel:+201005550199" */
export function telLink(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** "+20 100 555 0199" -> "https://wa.me/201005550199" (WhatsApp wants digits only, no "+"). */
export function whatsAppLink(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}
