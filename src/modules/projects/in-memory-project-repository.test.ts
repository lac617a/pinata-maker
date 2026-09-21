import { InMemoryProjectRepository } from "./in-memory-project-repository";
import { describeProjectRepository } from "./project-repository.contract";

describeProjectRepository("in memory", () => new InMemoryProjectRepository());
