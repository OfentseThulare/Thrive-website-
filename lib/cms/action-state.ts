export type CmsActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fields?: Record<string, string[]> };

export const initialCmsActionState: CmsActionState = { status: "idle" };

export type MfaEnrolActionState = CmsActionState | {
  status: "enrolment";
  message: string;
  factorId: string;
  qrCode: string;
  secret: string;
};

export function safeCmsError(error: unknown): CmsActionState {
  if (error instanceof Error && error.name === "CmsAuthorisationError") {
    return { status: "error", message: error.message };
  }

  if (error instanceof Error && error.name === "CmsMfaRequiredError") {
    return {
      status: "error",
      message: "Two-step verification is required. Open Security in the CMS, verify your authenticator code, then try again.",
    };
  }

  return {
    status: "error",
    message: "We could not save that change. Check the form and try again.",
  };
}
