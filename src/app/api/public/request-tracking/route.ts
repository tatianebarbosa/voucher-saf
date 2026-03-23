import { publicRequestTrackingQuerySchema } from "@/lib/request-schema";
import {
  apiError,
  apiErrorFromUnknown,
  apiSuccess,
} from "@/lib/server/api-response";
import { getPublicRequestTrackingByTicketNumber } from "@/lib/server/requests";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedQuery = publicRequestTrackingQuerySchema.parse({
      ticketNumber:
        searchParams.get("ticket") ??
        searchParams.get("ticketNumber") ??
        undefined,
    });
    const tracking = await getPublicRequestTrackingByTicketNumber(
      parsedQuery.ticketNumber,
    );

    if (!tracking) {
      return apiError(
        "Não encontramos uma solicitação com esse código de atendimento.",
        {
          status: 404,
          code: "REQUEST_NOT_FOUND",
        },
      );
    }

    return apiSuccess(
      { tracking },
      {
        meta: {
          message: "Código de atendimento localizado com sucesso.",
        },
      },
    );
  } catch (error) {
    return apiErrorFromUnknown(error, {
      fallbackMessage:
        "Não foi possível consultar o código de atendimento informado.",
      validationMessage: "Informe um código de atendimento válido.",
    });
  }
}
