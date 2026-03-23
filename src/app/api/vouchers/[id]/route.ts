import {
  normalizeVoucherUpdateDraft,
  voucherUpdateSchema,
} from "@/lib/voucher-schema";
import {
  apiError,
  apiErrorFromUnknown,
  apiSuccess,
} from "@/lib/server/api-response";
import { buildUserAuditActor } from "@/lib/server/audit-log";
import { requireSafSession } from "@/lib/server/auth-guard";
import {
  getVoucherById,
  updateVoucher,
  VoucherSchoolNotFoundError,
} from "@/lib/server/vouchers";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { response, scope } = await requireSafSession("vouchers.read");

    if (response) {
      return response;
    }

    const { id } = await context.params;
    const voucher = await getVoucherById(id, scope);

    if (!voucher) {
      return apiError("Voucher não encontrado.", {
        status: 404,
        code: "VOUCHER_NOT_FOUND",
      });
    }

    return apiSuccess(
      { voucher },
      {
        meta: {
          message: "Voucher carregado com sucesso.",
        },
      },
    );
  } catch (error) {
    return apiErrorFromUnknown(error, {
      fallbackMessage: "Não foi possível carregar o voucher.",
    });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { session, response, scope } = await requireSafSession(
      "vouchers.update",
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
    const parsedBody = voucherUpdateSchema.parse(body);
    const updatedVoucher = await updateVoucher(
      id,
      normalizeVoucherUpdateDraft(parsedBody),
      scope,
      buildUserAuditActor({
        userId: session.user.id,
        role: session.user.role,
        email: session.user.email,
        name: session.user.name,
      }),
    );

    if (!updatedVoucher) {
      return apiError("Voucher não encontrado.", {
        status: 404,
        code: "VOUCHER_NOT_FOUND",
      });
    }

    return apiSuccess(
      { voucher: updatedVoucher },
      {
        meta: {
          message: "Voucher atualizado com sucesso.",
        },
      },
    );
  } catch (error) {
    if (error instanceof VoucherSchoolNotFoundError) {
      return apiError(error.message, {
        status: 400,
        code: "SCHOOL_NOT_FOUND",
      });
    }

    return apiErrorFromUnknown(error, {
      fallbackMessage: "Não foi possível atualizar o voucher.",
      validationMessage: "Dados inválidos para atualização do voucher.",
    });
  }
}
