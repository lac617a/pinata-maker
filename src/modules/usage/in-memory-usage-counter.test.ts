import { InMemoryUsageCounter } from "./in-memory-usage-counter";
import { describeUsageCounter } from "./usage-counter.contract";

describeUsageCounter("In-memory", async () => ({
  counter: new InMemoryUsageCounter(),
  subject: (name) => `test:${name}`,
  day: "2026-09-21",
}));
