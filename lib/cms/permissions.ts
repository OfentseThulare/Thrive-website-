import { z } from "zod";

export const cmsRoleSchema = z.enum([
  "owner",
  "publisher",
  "editor",
  "scheduler",
  "finance",
  "auditor",
]);

export type CmsRole = z.infer<typeof cmsRoleSchema>;

export const contentRoles = ["owner", "publisher", "editor"] as const;
export const publishingRoles = ["owner", "publisher"] as const;
export const auditRoles = ["owner", "publisher", "auditor"] as const;

export function hasCmsRole(
  roles: readonly CmsRole[],
  allowed: readonly CmsRole[],
): boolean {
  return roles.some((role) => allowed.includes(role));
}

export function requireCmsRole(
  roles: readonly CmsRole[],
  allowed: readonly CmsRole[],
): void {
  if (!hasCmsRole(roles, allowed)) {
    throw new CmsAuthorisationError();
  }
}

export class CmsAuthorisationError extends Error {
  constructor() {
    super("You do not have permission to complete this action.");
    this.name = "CmsAuthorisationError";
  }
}

export class CmsMfaRequiredError extends Error {
  constructor() {
    super("Two-step verification is required for this action.");
    this.name = "CmsMfaRequiredError";
  }
}
