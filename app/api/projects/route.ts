import {
  handleCreateProject,
  handleListProjects,
} from "../../../src/presentation/http/project-endpoints";
import { projectRequestContext } from "../../../src/presentation/next/project-request-context";

// La ruta solo construye el contexto y delega. Ver docs/architecture.md §24.

export async function GET(): Promise<Response> {
  return handleListProjects(await projectRequestContext());
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateProject(request, await projectRequestContext());
}
