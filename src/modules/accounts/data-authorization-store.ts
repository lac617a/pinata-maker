import type { UserId } from "@/modules/projects/project";

/**
 * Where the proof of each data policy authorization lives (docs/legal.md §5).
 *
 * The time of the record is the store's own, not the caller's: it is what
 * proves when the person accepted.
 */
export interface DataAuthorizationStore {
  hasAccepted(userId: UserId, policyVersion: string): Promise<boolean>;

  record(userId: UserId, policyVersion: string): Promise<void>;
}

/** In memory, for the tests. Same contract. */
export class InMemoryDataAuthorizationStore implements DataAuthorizationStore {
  private readonly accepted = new Set<string>();

  async hasAccepted(userId: UserId, policyVersion: string): Promise<boolean> {
    return this.accepted.has(`${userId}|${policyVersion}`);
  }

  async record(userId: UserId, policyVersion: string): Promise<void> {
    this.accepted.add(`${userId}|${policyVersion}`);
  }
}
