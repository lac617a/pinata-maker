"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { DATA_POLICY_VERSION } from "@/modules/accounts/data-authorization";

/**
 * Remembered per browser and per policy version: someone who ticked it
 * yesterday is not asked again today, and everyone is asked again when the
 * policy changes. The server still checks every request (docs/legal.md §8).
 */
const STORAGE_KEY = "pm-terms-accepted";

/** The acceptance of the terms and the data policy, without an account. */
export function useTermsAcceptance() {
  const [accepted, setAccepted] = useState(false);

  // Read after mounting: the server has no storage, and rendering it ticked
  // there would not match the first render in the browser.
  useEffect(() => {
    try {
      setAccepted(localStorage.getItem(STORAGE_KEY) === DATA_POLICY_VERSION);
    } catch {
      // Private mode or blocked storage: ask every time, which is fine.
    }
  }, []);

  function change(value: boolean) {
    setAccepted(value);

    try {
      if (value) {
        localStorage.setItem(STORAGE_KEY, DATA_POLICY_VERSION);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Not remembered; the tick still counts for this visit.
    }
  }

  return { accepted, change };
}

/**
 * The box, never ticked by default: like Block Posters, a download without
 * an account starts by accepting the terms and the data policy.
 */
export function TermsAcceptanceBox({
  accepted,
  onChange,
}: {
  accepted: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="border-border bg-card flex items-start gap-3 rounded-lg border p-3 text-sm">
      <input
        id="accept-terms"
        type="checkbox"
        checked={accepted}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-primary mt-0.5 size-4 shrink-0"
      />
      <label htmlFor="accept-terms" className="text-muted-foreground">
        Acepto los{" "}
        <Link href="/terminos" className="text-foreground underline">
          términos de uso
        </Link>{" "}
        y autorizo el tratamiento de datos que describe la{" "}
        <Link href="/privacidad" className="text-foreground underline">
          política de tratamiento de datos
        </Link>
        : la imagen solo mientras se genera el PDF, sin guardarla.
      </label>
    </div>
  );
}
