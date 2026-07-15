import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const publicReferenceSchema = z.string().regex(/^TTC-[A-Z0-9]{12}$/);

export const holdRequestSchema = z.object({
  serviceId: uuidSchema,
  startsAt: z.string().datetime({ offset: true }),
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().toLowerCase().email().max(320),
  telephone: z.string().trim().max(40).regex(/^[+()\d .]*$/).optional().or(z.literal("")),
  consentVersionId: uuidSchema,
  consentAccepted: z.literal(true),
  idempotencyKey: uuidSchema,
}).strict();

export const availabilityRequestSchema = z.object({
  serviceId: uuidSchema,
  from: localDateSchema,
  to: localDateSchema,
});

export const serviceInputSchema = z.object({
  id: uuidSchema.optional(),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(2).max(140),
  description: z.string().trim().min(10).max(1000),
  durationMinutes: z.coerce.number().int().min(15).max(240),
  bufferMinutes: z.coerce.number().int().min(0).max(120),
  priceRands: z.coerce.number().min(0).max(100000),
  active: z.enum(["on"]).optional().transform(Boolean),
  position: z.coerce.number().int().min(0).max(1000),
});

export const availabilityRuleInputSchema = z.object({
  serviceId: z.union([uuidSchema, z.literal("")]).transform((value) => value || null),
  weekday: z.coerce.number().int().min(0).max(6),
  startsAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endsAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  effectiveFrom: localDateSchema,
  effectiveUntil: z.union([localDateSchema, z.literal("")]).transform((value) => value || null),
});

export const availabilityExceptionInputSchema = z.object({
  serviceId: z.union([uuidSchema, z.literal("")]).transform((value) => value || null),
  startsAt: z.string().datetime({ local: true }),
  endsAt: z.string().datetime({ local: true }),
  available: z.enum(["on"]).optional().transform(Boolean),
  reason: z.string().trim().max(240),
});

export const consentInputSchema = z.object({
  version: z.string().trim().min(1).max(30),
  wording: z.string().trim().min(20).max(10000),
  effectiveAt: z.string().datetime({ local: true }),
  active: z.enum(["on"]).optional().transform(Boolean),
});

export const bookingTransitionSchema = z.object({
  bookingId: uuidSchema,
  toState: z.enum(["CANCELLED", "COMPLETED", "NO_SHOW"]),
});
