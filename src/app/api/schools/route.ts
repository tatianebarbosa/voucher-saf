import {
  normalizeSchoolDraft,
  schoolFormSchema,
  schoolListQuerySchema,
} from "@/lib/school-schema";
import {
  apiError,
  apiErrorFromUnknown,
  apiSuccess,
} from "@/lib/server/api-response";
import { buildUserAuditActor } from "@/lib/server/audit-log";
import { requireSafSession } from "@/lib/server/auth-guard";
import {
  SchoolConflictError,
  createSchool,
  listSchools,
} from "@/lib/server/schools";

function duplicateSchoolResponse(error: SchoolConflictError) {
  return apiError(error.message, {
    status: 409,
    code: "DUPLICATE_SCHOOL",
    details: {
      fieldErrors: {
        [error.field]: [error.message],
      },
    },
  });
}

export async function GET(request: Request) {
  try {
    const { response, scope } = await requireSafSession("schools.read");

    if (response) {
      return response;
    }

    const { searchParams } = new URL(request.url);
    const parsedQuery = schoolListQuerySchema.parse({
      query: searchParams.get("query") ?? undefined,
    });
    const result = await listSchools(parsedQuery, scope);

    return apiSuccess(result, {
      meta: {
        message: "Escolas carregadas com sucesso.",
      },
    });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      fallbackMessage: "Não foi possível carregar as escolas.",
      validationMessage: "Parâmetros inválidos para a consulta de escolas.",
    });
  }
}

export async function POST(request: Request) {
  try {
    const { session, response } = await requireSafSession("schools.create");

    if (response) {
      return response;
    }

    if (!session) {
      return apiError("Sua sessão interna expirou.", {
        status: 401,
        code: "AUTH_REQUIRED",
      });
    }

    const body = await request.json();
    const parsedBody = schoolFormSchema.parse(body);
    const createdSchool = await createSchool(
      normalizeSchoolDraft(parsedBody),
      buildUserAuditActor({
        userId: session.user.id,
        role: session.user.role,
        email: session.user.email,
        name: session.user.name,
      }),
    );

    return apiSuccess(
      { school: createdSchool },
      {
        status: 201,
        meta: {
          message: "Escola criada com sucesso.",
        },
      },
    );
  } catch (error) {
    if (error instanceof SchoolConflictError) {
      return duplicateSchoolResponse(error);
    }

    return apiErrorFromUnknown(error, {
      fallbackMessage: "Não foi possível criar a escola.",
      validationMessage: "Dados inválidos para cadastro da escola.",
    });
  }
}
