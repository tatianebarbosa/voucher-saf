import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AccessPolicyError } from "@/lib/server/policy";
import type {
  ApiErrorDetails,
  ApiErrorPayload,
  ApiMeta,
  ApiSuccess,
} from "@/types/api";

interface ApiErrorOptions {
  status?: number;
  code?: string;
  details?: ApiErrorDetails | Record<string, unknown>;
}

interface ApiSuccessOptions extends ResponseInit {
  meta?: ApiMeta;
}

interface ApiErrorFromUnknownOptions {
  fallbackMessage: string;
  fallbackCode?: string;
  validationMessage?: string;
  validationCode?: string;
}

export function apiSuccess<T>(data: T, options: ApiSuccessOptions = {}) {
  const { meta, ...init } = options;

  return NextResponse.json<ApiSuccess<T>>(
    {
      success: true,
      data,
      ...(meta ? { meta } : {}),
    },
    init,
  );
}

export function apiError(message: string, options: ApiErrorOptions = {}) {
  const { status = 500, code = "INTERNAL_ERROR", details } = options;

  return NextResponse.json<ApiErrorPayload>(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status },
  );
}

export function apiErrorFromUnknown(
  error: unknown,
  options: ApiErrorFromUnknownOptions,
) {
  if (error instanceof AccessPolicyError) {
    return apiError(error.message, {
      status: error.status,
      code: error.code,
      details: error.details,
    });
  }

  if (error instanceof ZodError) {
    return apiError(options.validationMessage ?? "Dados inválidos.", {
      status: 400,
      code: options.validationCode ?? "VALIDATION_ERROR",
      details: error.flatten(),
    });
  }

  console.error(error);

  return apiError(options.fallbackMessage, {
    status: 500,
    code: options.fallbackCode ?? "INTERNAL_ERROR",
  });
}
