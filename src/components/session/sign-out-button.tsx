"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useSignOut } from "@/presentation/client/api/session";

export function SignOutButton() {
  const router = useRouter();
  const signOut = useSignOut();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={signOut.isPending}
      onClick={() =>
        signOut.mutate(undefined, {
          onSuccess: () => {
            router.replace("/");
            router.refresh();
          },
          onError: (error) => toast.error(error.message),
        })
      }
    >
      Salir
    </Button>
  );
}
