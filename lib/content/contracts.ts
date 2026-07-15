import { z } from "zod";

const linkSchema = z.object({
  label: z.string().trim().min(1).max(80),
  href: z.string().trim().min(1).max(300),
});

const imageSchema = z.object({
  src: z.string().trim().min(1).max(500),
  alt: z.string().trim().min(1).max(240),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const heroBlockSchema = z.object({
  blockType: z.literal("hero"),
  eyebrow: z.string().trim().min(1).max(120),
  heading: z.string().trim().min(1).max(180),
  body: z.string().trim().min(1).max(800),
  primaryAction: linkSchema,
  secondaryAction: linkSchema.optional(),
  image: imageSchema,
});

const introductionBlockSchema = z.object({
  blockType: z.literal("introduction"),
  eyebrow: z.string().trim().min(1).max(120),
  heading: z.string().trim().min(1).max(180),
  body: z.array(z.string().trim().min(1).max(1200)).min(1).max(6),
});

const cardCollectionBlockSchema = z.object({
  blockType: z.literal("card_collection"),
  eyebrow: z.string().trim().min(1).max(120),
  heading: z.string().trim().min(1).max(180),
  cards: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        body: z.string().trim().min(1).max(600),
        link: linkSchema.optional(),
      }),
    )
    .min(1)
    .max(8),
});

const callToActionBlockSchema = z.object({
  blockType: z.literal("call_to_action"),
  heading: z.string().trim().min(1).max(180),
  body: z.string().trim().min(1).max(600),
  action: linkSchema,
});

export const contentBlockSchema = z.discriminatedUnion("blockType", [
  heroBlockSchema,
  introductionBlockSchema,
  cardCollectionBlockSchema,
  callToActionBlockSchema,
]);

export const pageContentSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().min(1).max(320),
  status: z.enum(["draft", "published"]),
  sections: z.array(contentBlockSchema).min(1),
});

export type ContentBlock = z.infer<typeof contentBlockSchema>;
export type PageContent = z.infer<typeof pageContentSchema>;
