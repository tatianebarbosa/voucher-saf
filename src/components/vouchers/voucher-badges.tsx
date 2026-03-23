import { Badge } from "@/components/ui/badge";
import { formatVoucherStatus, formatVoucherType } from "@/lib/formatters";
import type { VoucherStatus, VoucherType } from "@/types/voucher";

export function VoucherTypeBadge({ voucherType }: { voucherType: VoucherType }) {
  if (voucherType === "campanha") {
    return <Badge>{formatVoucherType(voucherType)}</Badge>;
  }

  return (
    <Badge className="border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-muted-foreground)]">
      {formatVoucherType(voucherType)}
    </Badge>
  );
}

export function VoucherStatusBadge({
  status,
}: {
  status: VoucherStatus;
}) {
  if (status === "enviado") {
    return (
      <Badge className="border-[#d5e8d7] bg-[#f4fbf5] text-[#3d7a4b]">
        {formatVoucherStatus(status)}
      </Badge>
    );
  }

  if (status === "ativo") {
    return (
      <Badge className="border-[#d7e5f5] bg-[#f3f8fe] text-[#2c5d90]">
        {formatVoucherStatus(status)}
      </Badge>
    );
  }

  if (status === "esgotado" || status === "expirado") {
    return (
      <Badge className="border-[#f6dcc3] bg-[#fff7ef] text-[#b56a20]">
        {formatVoucherStatus(status)}
      </Badge>
    );
  }

  if (status === "cancelado") {
    return (
      <Badge className="border-red-100 bg-red-50 text-[var(--color-primary)]">
        {formatVoucherStatus(status)}
      </Badge>
    );
  }

  return (
    <Badge className="border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-foreground)]">
      {formatVoucherStatus(status)}
    </Badge>
  );
}
