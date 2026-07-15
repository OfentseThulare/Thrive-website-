import { z } from "zod";

const cmsHostLabel = "[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?";
const cmsInternalHref = /^\/(?!\/)[A-Za-z0-9._~!$&()*+,;=:@%/?#-]*$/;
const cmsHttpHref = new RegExp(
  `^https?://${cmsHostLabel}(?:\\.${cmsHostLabel})*(?::([0-9]{1,5}))?(?:[/?#][A-Za-z0-9._~!$&()*+,;=:@%/?#-]*)?$`,
);
const cmsMailtoHref = new RegExp(`^mailto:[A-Za-z0-9._%+-]+@${cmsHostLabel}(?:\\.${cmsHostLabel})*$`);
const cmsTelephoneHref = /^tel:\+?[0-9][0-9()-]{6,24}$/;

export function isSafeCmsHref(value: string) {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint < 0x21 || codePoint > 0x7e) return false;
  }
  if (cmsInternalHref.test(value)) return true;
  const httpMatch = cmsHttpHref.exec(value);
  if (httpMatch) {
    if (!httpMatch[1]) return true;
    const port = Number(httpMatch[1]);
    return Number.isInteger(port) && port >= 1 && port <= 65_535;
  }
  return cmsMailtoHref.test(value) || cmsTelephoneHref.test(value);
}

export const cmsHrefSchema = z
  .string()
  .min(1)
  .max(300)
  .refine(isSafeCmsHref, "Use an approved CMS path or explicit lowercase http, https, mailto or tel link");
