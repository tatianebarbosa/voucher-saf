import {
  normalizeVoucherDraft,
  normalizeVoucherListFilters,
  voucherFormSchema,
} from "@/lib/voucher-schema";
import {
  apiError,
  apiErrorFromUnknown,
  apiSuccess,
} from "@/lib/server/api-response";
import { buildUserAuditActor } from "@/lib/server/audit-log";
import { requireSafSession } from "@/lib/server/auth-guard";
import {
  createVoucher,
  listVouchers,
  VoucherSchoolNotFoundError,
} from "@/lib/server/vouchers";

export async function GET(request: Request) {
  try {
    const { response, scope } = await requireSafSession("vouchers.read");

    if (response) {
      return response;
    }

    const { searchParams } = new URL(request.url);
    const filters = normalizeVoucherListFilters({
      query: searchParams.get("query") ?? undefined,
      schoolId: searchParams.get("schoolId") ?? undefined,
      campaignName: searchParams.get("campaignName") ?? undefined,
      voucherType: searchParams.get("voucherType") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });
    const result = await listVouchers(filters, scope);

    return apiSuccess(result, {
      meta: {
        message: "Vouchers carregados com sucesso.",
      },
    });
  } catch (error) {
    return apiErrorFromUnknown(error, {
      fallbackMessage: "Não foi possível carregar os vouchers.",
      validationMessage: "Parâmetros inválidos para a consulta de vouchers.",
    });
  }
}

export async function POST(request: Request) {
  try {
    const { session, response, scope } = await requireSafSession(
      "vouchers.create",
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

    const body = await request.json();
    const parsedBody = voucherFormSchema.parse(body);
    const createdVoucher = await createVoucher(
      normalizeVoucherDraft(parsedBody),
      scope,
      buildUserAuditActor({
        userId: session.user.id,
        role: session.user.role,
        email: session.user.email,
        name: session.user.name,
      }),
    );

    return apiSuccess(
      { voucher: createdVoucher },
      {
        status: 201,
        meta: {
          message: "Voucher criado com sucesso.",
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
      fallbackMessage: "Não foi possível criar o voucher.",
      validationMessage: "Dados inválidos para cadastro do voucher.",
    });
  }
}
