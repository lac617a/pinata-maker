"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDeleteAccount } from "@/presentation/client/api/session";

/** What has to be typed to confirm. */
const CONFIRMATION = "BORRAR";

/**
 * Deleting the account from the app (docs/legal.md §6).
 *
 * Folded away and behind a typed word: it cannot be undone, so it must not
 * happen by a slip. What goes with it is said before, not after.
 */
export function DeleteAccount() {
  const router = useRouter();
  const remove = useDeleteAccount();
  const [typed, setTyped] = useState("");

  return (
    <details className="border-border rounded-lg border p-4">
      <summary className="cursor-pointer font-serif text-lg">Tu cuenta</summary>

      <div className="mt-4 space-y-4 text-sm">
        <p className="text-muted-foreground">
          Borrar la cuenta borra también todos tus proyectos, sus imágenes y los
          PDF generados. No se puede deshacer.
        </p>

        <div className="space-y-2">
          <Label htmlFor="delete-account-confirmation">
            Escribe {CONFIRMATION} para confirmarlo
          </Label>
          <Input
            id="delete-account-confirmation"
            autoComplete="off"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            className="max-w-xs"
          />
        </div>

        <Button
          variant="destructive"
          disabled={typed.trim() !== CONFIRMATION || remove.isPending}
          onClick={() =>
            remove.mutate(undefined, {
              onSuccess: () => {
                toast.success("Tu cuenta y todos tus datos se han borrado.");
                router.replace("/");
                router.refresh();
              },
              onError: (error) => toast.error(error.message),
            })
          }
        >
          {remove.isPending ? "Borrando…" : "Borrar mi cuenta"}
        </Button>
      </div>
    </details>
  );
}
