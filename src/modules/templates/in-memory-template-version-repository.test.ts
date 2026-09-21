import { InMemoryProjectRepository } from "../projects/in-memory-project-repository";
import { InMemoryTemplateVersionRepository } from "./in-memory-template-version-repository";
import { describeTemplateVersionRepository } from "./template-version-repository.contract";

describeTemplateVersionRepository("in memory", () => {
  const projects = new InMemoryProjectRepository();

  return {
    versions: new InMemoryTemplateVersionRepository(projects),
    projects,
  };
});
