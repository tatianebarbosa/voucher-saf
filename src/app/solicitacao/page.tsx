import Image from "next/image";

import { RequestForm } from "@/components/requests/request-form";

export default function SchoolRequestPage() {
  return (
    <div className="space-y-8">
      <section className="-mt-5 space-y-5">
        <div className="layout-viewport-bleed overflow-hidden">
          <div className="relative h-52 w-full bg-[var(--color-surface-muted)] sm:h-60 md:h-72 lg:h-80">
            <Image
              src="/brand/request-hero-banner1.jpg"
              alt="Alunas da Maple Bear em frente a escola"
              fill
              priority
              sizes="100vw"
              className="object-cover object-[center_20%]"
            />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="max-w-4xl font-heading text-4xl font-bold leading-[0.96] tracking-tight text-[var(--color-foreground)] md:text-6xl">
            Solicitações de Voucher
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-[var(--color-foreground)]/88">
            Canal para registrar solicitações de desconto, parcelamento ou
            desmembramento de voucher e acompanhar a tratativa de cada pedido.
          </p>
        </div>
      </section>

      <RequestForm />
    </div>
  );
}
