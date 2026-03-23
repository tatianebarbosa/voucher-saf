import { CopyButton } from "@/components/ui/copy-button";
import { Card, CardContent } from "@/components/ui/card";
import { buildRequestStatusMessage } from "@/lib/generate-request";
import type { VoucherRequest } from "@/types/request";

function GeneratedBlock({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-heading text-xl font-bold tracking-tight text-[var(--color-foreground)]">
              {title}
            </h3>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Texto gerado automaticamente para copiar e utilizar no fluxo.
            </p>
          </div>
          <CopyButton value={content} />
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-[10px] bg-[var(--color-surface-muted)] p-5 font-body text-sm leading-7 text-[var(--color-foreground)]">
          {content}
        </pre>
      </CardContent>
    </Card>
  );
}

export function GeneratedTextsPanel({ request }: { request: VoucherRequest }) {
  const statusMessageTitle =
    request.status === "Negada"
      ? "Mensagem de negativa para atendimento"
      : request.status === "Pronta para envio"
        ? "Mensagem de aprovação para atendimento"
        : "Mensagem de retorno para atendimento";

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-primary)]">
          Textos gerados
        </p>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
          Conteúdos prontos para uso
        </h2>
      </div>

      {request.generatedTexts.voucherCode ? (
        <GeneratedBlock
          title="Código do voucher"
          content={request.generatedTexts.voucherCode}
        />
      ) : null}
      <GeneratedBlock
        title="Título do e-mail"
        content={request.generatedTexts.emailTitle}
      />
      <GeneratedBlock
        title="Texto para comercial e diretoria"
        content={request.generatedTexts.emailBody}
      />
      <GeneratedBlock
        title={statusMessageTitle}
        content={buildRequestStatusMessage(request)}
      />
      <GeneratedBlock
        title="Descrição Magento"
        content={request.generatedTexts.magentoDescription}
      />
    </section>
  );
}
