import {
  createProject,
  deleteProject,
  listProjects,
  openProject,
  type ProjectServices,
  renameUserProject,
} from "@/application/manage-projects";
import type { Project, ProjectId, UserId } from "@/modules/projects/project";

import {
  jsonResponse,
  toErrorResponse,
  unauthorizedResponse,
} from "./error-response";

/**
 * Lo que una ruta aporta a un caso de uso.
 *
 * `userId` es `null` cuando nadie ha iniciado sesión. Llega ya resuelto:
 * averiguar quién pide la petición es trabajo de la ruta, no del endpoint.
 */
export type ProjectRequestContext = {
  readonly services: ProjectServices;
  readonly userId: UserId | null;
};

/**
 * Los endpoints son finos a propósito.
 *
 * Validan la entrada, llaman a un caso de uso y traducen el resultado o el
 * fallo. No contienen reglas del dominio. Ver docs/architecture.md §24.
 *
 * Son funciones y no manejadores de Next para que puedan probarse con un
 * repositorio en memoria, sin servidor ni base de datos. El archivo de la
 * ruta solo construye el contexto y delega.
 */

export async function handleListProjects(
  context: ProjectRequestContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  try {
    const projects = await listProjects(context.services, context.userId);

    return jsonResponse({ projects: projects.map(toPayload) }, 200);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function handleCreateProject(
  request: Request,
  context: ProjectRequestContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  try {
    const { name } = await readJsonBody(request);

    const project = await createProject(context.services, {
      ownerId: context.userId,
      name: asName(name),
    });

    return jsonResponse({ project: toPayload(project) }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function handleGetProject(
  id: ProjectId,
  context: ProjectRequestContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  try {
    const project = await openProject(context.services, id, context.userId);

    return jsonResponse({ project: toPayload(project) }, 200);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function handleRenameProject(
  request: Request,
  id: ProjectId,
  context: ProjectRequestContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  try {
    const { name } = await readJsonBody(request);

    const project = await renameUserProject(
      context.services,
      id,
      context.userId,
      asName(name),
    );

    return jsonResponse({ project: toPayload(project) }, 200);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function handleDeleteProject(
  id: ProjectId,
  context: ProjectRequestContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  try {
    await deleteProject(context.services, id, context.userId);

    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * Representación del proyecto que sale por la API.
 *
 * No incluye `ownerId`: quien pregunta ya sabe que es suyo, porque si no lo
 * fuera no lo habría recibido. Ver docs/storage.md §29.
 */
function toPayload(project: Project) {
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

/** Un cuerpo que no es JSON es un error del cliente, no una excepción. */
async function readJsonBody(request: Request): Promise<{ name?: unknown }> {
  try {
    const body = await request.json();

    return typeof body === "object" && body !== null ? body : {};
  } catch {
    return {};
  }
}

/**
 * Validación de entrada, no de dominio.
 *
 * Comprueba que llega un texto; que ese texto sea un nombre de proyecto
 * válido lo decide el dominio. Ver docs/AGENTS.md §25.
 */
function asName(value: unknown): string {
  return typeof value === "string" ? value : "";
}
