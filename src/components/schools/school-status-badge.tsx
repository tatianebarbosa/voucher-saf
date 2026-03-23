import { Badge } from "@/components/ui/badge";

export function SchoolStatusBadge({
  status,
}: {
  status?: string;
}) {
  if (!status) {
    return (
      <Badge className="border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-muted-foreground)]">
        Sem status
      </Badge>
    );
  }

  const normalizedStatus = status.toLocaleLowerCase("pt-BR");

  if (normalizedStatus.includes("oper")) {
    return (
      <Badge className="border-[#d5e8d7] bg-[#f4fbf5] text-[#3d7a4b]">
        {status}
      </Badge>
    );
  }

  if (normalizedStatus.includes("implant")) {
    return (
      <Badge className="border-[#f6dcc3] bg-[#fff7ef] text-[#b56a20]">
        {status}
      </Badge>
    );
  }

  if (normalizedStatus.includes("alert")) {
    return (
      <Badge className="border-red-100 bg-red-50 text-[var(--color-primary)]">
        {status}
      </Badge>
    );
  }

  return (
    <Badge className="border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-foreground)]">
      {status}
    </Badge>
  );
}
