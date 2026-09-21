import { InMemoryProjectRepository } from "../projects/in-memory-project-repository";
import { describeExportRepository } from "./export-repository.contract";
import { InMemoryExportRepository } from "./in-memory-export-repository";

describeExportRepository("in memory", () => {
  const projects = new InMemoryProjectRepository();

  return { exports: new InMemoryExportRepository(projects), projects };
});
