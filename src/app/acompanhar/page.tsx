import { redirect } from "next/navigation";

import { PublicRequestTracking } from "@/components/requests/public-request-tracking";

interface PublicTrackingPageProps {
  searchParams: Promise<{
    ticket?: string;
  }>;
}

export default async function PublicTrackingPage({
  searchParams,
}: PublicTrackingPageProps) {
  const { ticket } = await searchParams;
  const normalizedTicket = ticket?.trim();

  if (normalizedTicket) {
    redirect(
      `/acompanhar/detalhes?ticket=${encodeURIComponent(normalizedTicket)}`,
    );
  }

  return <PublicRequestTracking />;
}
