export interface ApiMeta {
  message?: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorDetails {
  fieldErrors?: Record<string, string[] | undefined>;
  formErrors?: string[];
}

export interface ApiErrorPayload {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetails | Record<string, unknown>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorPayload;
