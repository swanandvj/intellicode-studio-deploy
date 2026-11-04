import { HTTPError } from "ky";

// A 503 means the request was fine and retrying later will help, so show the
// server's explanation instead of a message that blames the user's input.
export const getApiErrorMessage = async (error: unknown, fallback: string) => {
  if (!(error instanceof HTTPError) || error.response.status !== 503) {
    return fallback;
  }

  try {
    const body = (await error.response.clone().json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
};
