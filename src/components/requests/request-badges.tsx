import { formatRequestStatus } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import type { RequestStatus, RequestType } from "@/types/request";

export function RequestTypeBadge({ requestType }: { requestType: RequestType }) {
  if (requestType === "desconto") {
    return <Badge>Desconto</Badge>;
  }

  if (requestType === "desmembramento") {
    return (
      <Badge className="border-sky-200 bg-sky-50 text-sky-700">
        Desmembramento
      </Badge>
    );
  }

  return (
    <Badge className="border-[#f6dcc3] bg-[#fff7ef] text-[#b56a20]">
      Parcelamento
    </Badge>
  );
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  if (status === "Pronta para envio") {
    return (
      <Badge className="border-[#d5e8d7] bg-[#f4fbf5] text-[#3d7a4b]">
        {formatRequestStatus(status)}
      </Badge>
    );
  }

  if (status === "Negada") {
    return (
      <Badge className="border-red-200 bg-red-100 text-[#9f1822]">
        {formatRequestStatus(status)}
      </Badge>
    );
  }

  if (status === "Em analise") {
    return (
      <Badge className="border-[#f6dcc3] bg-[#fff7ef] text-[#b56a20]">
        {formatRequestStatus(status)}
      </Badge>
    );
  }

  return (
    <Badge className="border-red-100 bg-red-50 text-[var(--color-primary)]">
      {formatRequestStatus(status)}
    </Badge>
  );
}
