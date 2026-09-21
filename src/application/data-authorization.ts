import {
  createDataAuthorization,
  DATA_POLICY_VERSION,
} from "@/modules/accounts/data-authorization";
import type { DataAuthorizationStore } from "@/modules/accounts/data-authorization-store";
import type { UserId } from "@/modules/projects/project";

export type DataAuthorizationServices = {
  readonly authorizations: DataAuthorizationStore;
  readonly now: () => Date;
};

/**
 * Whether this account still has to accept the current data policy.
 *
 * True for accounts created before the proof was recorded (0009), and for
 * every account after the policy changes version (docs/legal.md §7).
 */
export async function needsDataAuthorization(
  services: DataAuthorizationServices,
  userId: UserId,
): Promise<boolean> {
  return !(await services.authorizations.hasAccepted(
    userId,
    DATA_POLICY_VERSION,
  ));
}

/**
 * Records that the signed-in person accepted the current policy. Only an
 * explicit `true` counts, as at sign-up.
 */
export async function acceptDataPolicy(
  services: DataAuthorizationServices,
  userId: UserId,
  accepted: unknown,
): Promise<void> {
  const authorization = createDataAuthorization(accepted, services.now());

  await services.authorizations.record(userId, authorization.policyVersion);
}
