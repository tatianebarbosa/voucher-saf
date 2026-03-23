import {
  BadgePercent,
  FileCheck2,
  Files,
  HandCoins,
  Split,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { VoucherRequest } from "@/types/request";

const statIcons = [Files, BadgePercent, HandCoins, Split, FileCheck2];

export function RequestStats({ requests }: { requests: VoucherRequest[] }) {
  const stats = [
    {
      label: "Solicitações registradas",
      value: requests.length,
    },
    {
      label: "Pedidos de desconto",
      value: requests.filter((request) => request.requestType === "desconto").length,
    },
    {
      label: "Pedidos de parcelamento",
      value: requests.filter((request) => request.requestType === "parcelamento").length,
    },
    {
      label: "Pedidos de desmembramento",
      value: requests.filter((request) => request.requestType === "desmembramento").length,
    },
    {
      label: "Prontas para envio",
      value: requests.filter((request) => request.status === "Pronta para envio").length,
    },
  ];

  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {stats.map((stat, index) => {
        const Icon = statIcons[index];

        return (
          <Card key={stat.label} className="h-full">
            <CardContent className="flex items-start justify-between gap-2.5 px-3.5 py-2.5">
              <div className="space-y-1.5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
                  {stat.label}
                </p>
                <p className="font-heading text-[2rem] font-bold leading-none tracking-tight text-[var(--color-foreground)]">
                  {stat.value}
                </p>
              </div>
              <span className="flex size-8 items-center justify-center rounded-[7px] border border-red-100 bg-red-50 text-[var(--color-primary)]">
                <Icon className="size-3" />
              </span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
