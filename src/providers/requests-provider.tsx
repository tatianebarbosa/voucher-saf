"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

import type { RequestFormData } from "@/lib/request-schema";
import type { ApiResponse } from "@/types/api";
import type {
  RequestStatus,
  VoucherRequest,
} from "@/types/request";

interface RequestsListData {
  requests: VoucherRequest[];
}

interface RequestData {
  request: VoucherRequest;
}

interface RequestsContextValue {
  requests: VoucherRequest[];
  isReady: boolean;
  isRefreshing: boolean;
  error: string | null;
  errorCode: string | null;
  addRequest: (draft: RequestFormData) => Promise<VoucherRequest>;
  updateRequestStatus: (
    id: string,
    input: {
      status: RequestStatus;
      decisionReason?: string;
    },
  ) => Promise<VoucherRequest | undefined>;
  getRequestById: (id: string) => VoucherRequest | undefined;
  refreshRequests: () => Promise<void>;
}

const RequestsContext = createContext<RequestsContextValue | undefined>(
  undefined,
);

class RequestsProviderError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "RequestsProviderError";
    this.code = code;
  }
}

async function readApiResponse<T>(response: Response) {
  try {
    return (await response.json()) as ApiResponse<T>;
  } catch {
    return null;
  }
}

function buildProviderMessage(
  status: number | undefined,
  fallback: string,
  code?: string,
) {
  if (status === 401 || code === "AUTH_REQUIRED") {
    return "Sua sessão do SAF expirou ou você não tem acesso a esta área. Faça login novamente para continuar.";
  }

  if (status === 403 || code === "FORBIDDEN" || code === "OUT_OF_SCOPE") {
    return "Você não tem permissão para executar esta operação com o perfil atual.";
  }

  if (code === "REQUEST_NOT_FOUND") {
    return "A solicitação procurada não foi encontrada no ambiente atual.";
  }

  if (code === "SCHOOL_NOT_FOUND") {
    return "A escola selecionada não está mais disponível na base atual. Busque e selecione a escola novamente.";
  }

  return fallback;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Não foi possível concluir a operação.";
}

function getErrorCode(error: unknown) {
  if (error instanceof RequestsProviderError) {
    return error.code ?? null;
  }

  return null;
}

async function unwrapApiData<T>(
  response: Response,
  fallbackMessage: string,
) {
  const payload = await readApiResponse<T>(response);

  if (response.ok && payload?.success) {
    return payload.data;
  }

  const message =
    payload && !payload.success
      ? buildProviderMessage(
          response.status,
          payload.error.message,
          payload.error.code,
        )
      : buildProviderMessage(response.status, fallbackMessage);
  const code = payload && !payload.success ? payload.error.code : undefined;

  throw new RequestsProviderError(message, code);
}

export function RequestsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isInternalRoute =
    pathname.startsWith("/painel-saf") || pathname.startsWith("/solicitacoes");
  const [requests, setRequests] = useState<VoucherRequest[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function fetchRequestsData() {
    const response = await fetch("/api/requests", {
      cache: "no-store",
    });
    const data = await unwrapApiData<RequestsListData>(
      response,
      "Não foi possível carregar as solicitações.",
    );

    return data.requests;
  }

  const refreshRequests = async () => {
    if (!isInternalRoute) {
      setIsReady(true);
      setIsRefreshing(false);
      setError(null);
      setErrorCode(null);
      return;
    }

    setIsRefreshing(true);

    try {
      const nextRequests = await fetchRequestsData();
      setRequests(nextRequests);
      setError(null);
      setErrorCode(null);
    } catch (refreshError) {
      setRequests([]);
      setError(getErrorMessage(refreshError));
      setErrorCode(getErrorCode(refreshError));
    } finally {
      setIsReady(true);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    async function loadRequests() {
      if (!isInternalRoute) {
        if (!isCancelled) {
          setRequests([]);
          setIsReady(true);
          setIsRefreshing(false);
          setError(null);
          setErrorCode(null);
        }
        return;
      }

      if (!isCancelled) {
        setIsReady(false);
        setIsRefreshing(false);
      }

      try {
        const nextRequests = await fetchRequestsData();

        if (!isCancelled) {
          setRequests(nextRequests);
          setError(null);
          setErrorCode(null);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setRequests([]);
          setError(getErrorMessage(loadError));
          setErrorCode(getErrorCode(loadError));
        }
      } finally {
        if (!isCancelled) {
          setIsReady(true);
          setIsRefreshing(false);
        }
      }
    }

    loadRequests();

    return () => {
      isCancelled = true;
    };
  }, [isInternalRoute, pathname]);

  const addRequest = async (draft: RequestFormData) => {
    const response = await fetch("/api/requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(draft),
    });
    const data = await unwrapApiData<RequestData>(
      response,
      "Não foi possível criar a solicitação.",
    );
    const createdRequest = data.request;

    if (isInternalRoute) {
      setRequests((currentRequests) => [createdRequest, ...currentRequests]);
    }

    setError(null);
    setErrorCode(null);
    return createdRequest;
  };

  const updateRequestStatus = async (
    id: string,
    input: {
      status: RequestStatus;
      decisionReason?: string;
    },
  ) => {
    try {
      const response = await fetch(`/api/requests/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      const data = await unwrapApiData<RequestData>(
        response,
        "Não foi possível atualizar o status.",
      );
      const updatedRequest = data.request;

      setRequests((currentRequests) =>
        currentRequests
          .map((request) => (request.id === id ? updatedRequest : request))
          .sort(
            (left, right) =>
              new Date(right.updatedAt).getTime() -
              new Date(left.updatedAt).getTime(),
          ),
      );
      setError(null);
      setErrorCode(null);

      return updatedRequest;
    } catch (statusError) {
      const nextErrorCode = getErrorCode(statusError);

      if (nextErrorCode === "AUTH_REQUIRED") {
        setRequests([]);
      }

      setError(getErrorMessage(statusError));
      setErrorCode(nextErrorCode);
      return undefined;
    }
  };

  const getRequestById = (id: string) =>
    requests.find((request) => request.id === id);

  return (
    <RequestsContext.Provider
      value={{
        requests,
        isReady,
        isRefreshing,
        error,
        errorCode,
        addRequest,
        updateRequestStatus,
        getRequestById,
        refreshRequests,
      }}
    >
      {children}
    </RequestsContext.Provider>
  );
}

export function useRequests() {
  const context = useContext(RequestsContext);

  if (!context) {
    throw new Error("useRequests deve ser usado dentro de RequestsProvider.");
  }

  return context;
}
