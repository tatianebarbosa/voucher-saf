import {
  apiError,
  apiErrorFromUnknown,
  apiSuccess,
} from "@/lib/server/api-response";
import { requireSafSession } from "@/lib/server/auth-guard";
import { listAuditEventsByEntity } from "@/lib/server/audit-log";
import { getRequestById } from "@/lib/server/requests";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { response, scope } = await requireSafSession("requests.read");

    if (response) {
      return response;
    }

    const { id } = await context.params;
    const request = await getRequestById(id, scope);

    if (!request) {
      return apiError("Solicitação não encontrada.", {
        status: 404,
        code: "REQUEST_NOT_FOUND",
      });
    }

    const events = await listAuditEventsByEntity(
      {
        entityType: "request",
        entityId: id,
        take: 20,
      },
      scope,
    );

    return apiSuccess(
      { events },
      {
        meta: {
          message: "Histórico operacional carregado com sucesso.",
        },
      },
    );
  } catch (error) {
    return apiErrorFromUnknown(error, {
      fallbackMessage: "Não foi possível carregar o histórico operacional.",
    });
  }
}
