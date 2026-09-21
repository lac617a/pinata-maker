import { DataAuthorizationRequiredError } from "./errors";

/**
 * The version of the data policy a person agrees to.
 *
 * Colombian law (Ley 1581 de 2012, art. 9; Decreto 1377 de 2013, art. 7-8)
 * asks for prior, express and informed authorization, and for proof of it.
 * The proof is which text was accepted and when: change this whenever the
 * policy at /privacidad changes in substance (docs/legal.md §5).
 */
export const DATA_POLICY_VERSION = "2026-09-21";

export type DataAuthorization = {
  readonly policyVersion: string;
  readonly acceptedAt: Date;
};

/**
 * Only an explicit `true` counts. A missing field, a string or a pre-ticked
 * default the person never touched are not an authorization.
 */
export function createDataAuthorization(
  accepted: unknown,
  now: Date,
): DataAuthorization {
  if (accepted !== true) {
    throw new DataAuthorizationRequiredError(
      "An account needs the explicit authorization of the data policy.",
    );
  }

  return { policyVersion: DATA_POLICY_VERSION, acceptedAt: now };
}
