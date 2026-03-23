import { publicSchoolSearchQuerySchema } from "@/lib/school-schema";
import {
  apiErrorFromUnknown,
  apiSuccess,
} from "@/lib/server/api-response";
import { searchPublicSchoolOptions } from "@/lib/server/schools";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedQuery = publicSchoolSearchQuerySchema.parse({
      query: searchParams.get("query") ?? undefined,
    });
    const options = await searchPublicSchoolOptions(parsedQuery.query ?? "");

    return apiSuccess(
      { schools: options },
      {
        meta: {
          message: "Escolas disponíveis para selecao carregadas com sucesso.",
        },
      },
    );
  } catch (error) {
    return apiErrorFromUnknown(error, {
      fallbackMessage: "Não foi possível buscar as escolas disponíveis.",
      validationMessage: "Parametro inválido para busca de escolas.",
    });
  }
}
