import { SchoolDetailsWorkspace } from "@/components/schools/school-details-workspace";

interface SchoolDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SchoolDetailsPage({
  params,
}: SchoolDetailsPageProps) {
  const { id } = await params;

  return <SchoolDetailsWorkspace schoolId={id} />;
}
