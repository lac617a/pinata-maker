import { ProjectWorkspace } from "@/components/projects/project-workspace";

type RouteParams = { params: Promise<{ id: string }> };

export default async function Page({ params }: RouteParams) {
  const { id } = await params;

  return <ProjectWorkspace projectId={id} />;
}
