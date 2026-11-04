import { z } from "zod";
import { NextResponse } from "next/server";

type ParsedBody<T> =
  | { data: T; response?: undefined }
  | { data?: undefined; response: NextResponse };

// Bad input is the caller's mistake, so it gets a 400 rather than an unhandled 500
export const parseBody = async <T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<ParsedBody<z.infer<T>>> => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      response: NextResponse.json(
        { error: "Request body must be valid JSON" },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    return {
      response: NextResponse.json(
        { error: z.prettifyError(result.error) },
        { status: 400 }
      ),
    };
  }

  return { data: result.data };
};

export const workerUnavailableResponse = () =>
  NextResponse.json(
    { error: "The background worker is unavailable. Please try again shortly." },
    { status: 503 }
  );
