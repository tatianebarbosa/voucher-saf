import { requestStatusUpdateSchema } from "@/lib/request-schema";
import {
  apiError,
  apiErrorFromUnknown,
  apiSuccess,
} from "@/lib/server/api-response";
import { buildUserAuditActor } from "@/lib/server/audit-log";
import { requireSafSession } from "@/lib/server/auth-guard";
import { updateRequestStatus } from "@/lib/server/requests";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { session, response, scope } = await requireSafSession(
      "requests.update_status",
    );

    if (response) {
      return response;
    }

    if (!session) {
      return apiError("Sua sessão interna expirou.", {
        status: 401,
        code: "AUTH_REQUIRED",
      });
    }

    const { id } = await context.params;
    const body = await request.json();
    const parsedBody = requestStatusUpdateSchema.parse(body);
    const updatedRequest = await updateRequestStatus(
      id,
      parsedBody,
      scope,
      buildUserAuditActor({
        userId: session.user.id,
        role: session.user.role,
        email: session.user.email,
        name: session.user.name,
      }),
    );

    if (!updatedRequest) {
      return apiError("Solicitação não encontrada.", {
        status: 404,
        code: "REQUEST_NOT_FOUND",
      });
    }

    return apiSuccess(
      { request: updatedRequest },
      {
        meta: {
          message: "Status atualizado com sucesso.",
        },
      },
    );
  } catch (error) {
    return apiErrorFromUnknown(error, {
      fallbackMessage: "Não foi possível atualizar o status da solicitação.",
      validationMessage: "Dados inválidos para atualizar o status da solicitação.",
    });
  }
}
