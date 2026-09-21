import { InMemoryProjectRepository } from "../projects/in-memory-project-repository";
import { describeAssetRepository } from "./asset-repository.contract";
import { InMemoryAssetRepository } from "./in-memory-asset-repository";

describeAssetRepository("in memory", () => {
  const projects = new InMemoryProjectRepository();

  return { assets: new InMemoryAssetRepository(projects), projects };
});
