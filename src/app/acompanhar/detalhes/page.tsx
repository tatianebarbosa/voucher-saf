import { redirect } from "next/navigation";

import { PublicRequestTrackingDetails } from "@/components/requests/public-request-tracking-details";

interface PublicTrackingDetailsPageProps {
  searchParams: Promise<{
    ticket?: string;
  }>;
}

export default async function PublicTrackingDetailsPage({
  searchParams,
}: PublicTrackingDetailsPageProps) {
  const { ticket } = await searchParams;
  const normalizedTicket = ticket?.trim();

  if (!normalizedTicket) {
    redirect("/acompanhar");
  }

  return <PublicRequestTrackingDetails ticketNumber={normalizedTicket} />;
}
