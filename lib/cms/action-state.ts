export type CmsActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fields?: Record<string, string[]> };

export const initialCmsActionState: CmsActionState = { status: "idle" };

export function safeCmsError(error: unknown): CmsActionState {
  if (error instanceof Error && error.name === "CmsAuthorisationError") {
    return { status: "error", message: error.message };
  }

  return {
    status: "error",
    message: "We could not save that change. Check the form and try again.",
  };
}
