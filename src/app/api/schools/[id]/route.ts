import {
  normalizeSchoolDraft,
  schoolFormSchema,
} from "@/lib/school-schema";
import {
  apiError,
  apiErrorFromUnknown,
  apiSuccess,
} from "@/lib/server/api-response";
import { buildUserAuditActor } from "@/lib/server/audit-log";
import { requireSafSession } from "@/lib/server/auth-guard";
import {
  getSchoolById,
  getSchoolDetailsById,
  SchoolConflictError,
  updateSchool,
} from "@/lib/server/schools";
import { assertCanUpdateSchool } from "@/lib/server/policy";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

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

function parsePositivePageParam(request: Request, key: string) {
  const pageParam = new URL(request.url).searchParams.get(key);
  const page = Number(pageParam);

  if (!pageParam || Number.isNaN(page) || !Number.isFinite(page)) {
    return 1;
  }

  return Math.max(1, Math.floor(page));
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { response, scope } = await requireSafSession("schools.read");

    if (response) {
      return response;
    }

    const { id } = await context.params;
    const schoolDetails = await getSchoolDetailsById(
      id,
      {
        page: parsePositivePageParam(request, "page"),
        voucherPage: parsePositivePageParam(request, "voucherPage"),
      },
      scope,
    );

    if (!schoolDetails) {
      return apiError("Escola não encontrada.", {
        status: 404,
        code: "SCHOOL_NOT_FOUND",
      });
    }

    return apiSuccess(schoolDetails, {
      meta: {
        message: "Detalhe da escola carregado com sucesso.",
      },
    });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      fallbackMessage: "Não foi possível carregar o detalhe da escola.",
    });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { session, scope, response } = await requireSafSession();

    if (response) {
      return response;
    }

    const { id } = await context.params;
    const body = await request.json();
    const parsedBody = schoolFormSchema.parse(body);
    const currentSchool = await getSchoolById(id, scope);

    if (!currentSchool) {
      return apiError("Escola não encontrada.", {
        status: 404,
        code: "SCHOOL_NOT_FOUND",
      });
    }

    assertCanUpdateSchool(session.user.role, currentSchool, parsedBody);
    const updatedSchool = await updateSchool(
      id,
      normalizeSchoolDraft(parsedBody),
      scope,
      buildUserAuditActor({
        userId: session.user.id,
        role: session.user.role,
        email: session.user.email,
        name: session.user.name,
      }),
    );

    if (!updatedSchool) {
      return apiError("Escola não encontrada.", {
        status: 404,
        code: "SCHOOL_NOT_FOUND",
      });
    }

    return apiSuccess(
      { school: updatedSchool },
      {
        meta: {
          message: "Escola atualizada com sucesso.",
        },
      },
    );
  } catch (error) {
    if (error instanceof SchoolConflictError) {
      return duplicateSchoolResponse(error);
    }

    return apiErrorFromUnknown(error, {
      fallbackMessage: "Não foi possível atualizar a escola.",
      validationMessage: "Dados inválidos para atualização da escola.",
    });
  }
}
