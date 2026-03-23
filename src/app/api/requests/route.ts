import {
  normalizeRequestDraft,
  requestFormSchema,
} from "@/lib/request-schema";
import {
  apiError,
  apiErrorFromUnknown,
  apiSuccess,
} from "@/lib/server/api-response";
import { buildPublicAuditActor } from "@/lib/server/audit-log";
import { requireSafSession } from "@/lib/server/auth-guard";
import {
  createRequest,
  listRequests,
  RequestSchoolNotFoundError,
} from "@/lib/server/requests";

export async function GET() {
  try {
    const { response, scope } = await requireSafSession("requests.read");

    if (response) {
      return response;
    }

    const requests = await listRequests(scope);

    return apiSuccess(
      { requests },
      {
        meta: {
          message: "Solicitações carregadas com sucesso.",
        },
      },
    );
  } catch (error) {
    return apiErrorFromUnknown(error, {
      fallbackMessage: "Não foi possível carregar as solicitações.",
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedBody = requestFormSchema.parse(body);
    const createdRequest = await createRequest(
      normalizeRequestDraft(parsedBody),
      buildPublicAuditActor(`Formulário público | ${parsedBody.schoolName}`),
    );

    return apiSuccess(
      { request: createdRequest },
      {
        status: 201,
        meta: {
          message: "Solicitação criada com sucesso.",
        },
      },
    );
  } catch (error) {
    if (error instanceof RequestSchoolNotFoundError) {
      return apiError(error.message, {
        status: 400,
        code: "SCHOOL_NOT_FOUND",
      });
    }

    return apiErrorFromUnknown(error, {
      fallbackMessage: "Não foi possível processar a solicitação.",
      validationMessage: "Dados inválidos para a solicitação.",
    });
  }
}
