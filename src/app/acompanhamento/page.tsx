import { redirect } from "next/navigation";

interface TrackingRedirectPageProps {
  searchParams: Promise<{
    ticket?: string;
  }>;
}

export default async function TrackingRedirectPage({
  searchParams,
}: TrackingRedirectPageProps) {
  const { ticket } = await searchParams;
  const normalizedTicket = ticket?.trim();

  if (normalizedTicket) {
    redirect(
      `/acompanhar/detalhes?ticket=${encodeURIComponent(normalizedTicket)}`,
    );
  }

  redirect("/acompanhar");
}
