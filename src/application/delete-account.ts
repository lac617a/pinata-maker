import type { AssetRepository } from "@/modules/assets/asset-repository";
import type { ExportRepository } from "@/modules/exports/export-repository";
import type { ProjectId, UserId } from "@/modules/projects/project";
import type { ObjectStorage } from "@/modules/storage/object-storage";

import { openProject, type ProjectServices } from "./manage-projects";

/** What it takes to remove a project with everything it stored. */
export type ProjectFilesServices = ProjectServices & {
  readonly assets: AssetRepository;
  readonly exports: ExportRepository;
  readonly assetStorage: ObjectStorage;
  readonly exportStorage: ObjectStorage;
};

/**
 * Removes a project and its files: images and generated PDFs.
 *
 * Files first. The rows go with the project by cascade, but the files live
 * in the buckets, and the storage policies only let their owner delete them
 * while the project still exists (0006). Deleting the project first would
 * leave files nobody can reach or remove (docs/storage.md §164).
 *
 * If removing a file fails, nothing else is deleted: the project stays, and
 * trying again removes what is left.
 */
export async function deleteProjectWithFiles(
  services: ProjectFilesServices,
  id: ProjectId,
  userId: UserId,
): Promise<void> {
  const project = await openProject(services, id, userId);

  const [assets, exports] = await Promise.all([
    services.assets.listByProject(project.id, userId),
    services.exports.listByProject(project.id, userId),
  ]);

  for (const asset of assets) {
    await services.assetStorage.remove(asset.storageKey);
  }

  for (const generated of exports) {
    await services.exportStorage.remove(generated.storageKey);
  }

  await services.repository.delete(project.id, userId);
}

/** The account itself, once nothing else is left. */
export interface AccountRemoval {
  /**
   * Deletes the signed-in account and closes its session. Refuses while the
   * account still has projects: their files must go first.
   */
  deleteCurrentAccount(): Promise<void>;
}

export type AccountServices = ProjectFilesServices & {
  readonly accounts: AccountRemoval;
};

/**
 * Deletes an account with everything it holds: the right to deletion of Ley
 * 1581 de 2012, art. 8 (docs/legal.md §6).
 *
 * Every project goes first, files included; then the account, whose
 * remaining rows (usage counter, proof of authorization) go with it in the
 * database.
 */
export async function deleteAccount(
  services: AccountServices,
  userId: UserId,
): Promise<void> {
  const projects = await services.repository.listByOwner(userId);

  for (const project of projects) {
    await deleteProjectWithFiles(services, project.id, userId);
  }

  await services.accounts.deleteCurrentAccount();
}
