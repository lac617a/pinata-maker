"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Formulario de correo y contraseña.
 *
 * Es el mismo en entrar y en registrarse: lo que cambia es el texto y a
 * dónde va. Duplicarlo solo serviría para que un día dejaran de parecerse.
 *
 * No valida la contraseña por su cuenta. El mínimo lo decide el dominio
 * (`accounts/credentials.ts`) y repetirlo aquí crearía dos verdades.
 */
export function CredentialsForm({
  title,
  description,
  submitLabel,
  pending,
  error,
  onSubmit,
  footer,
}: {
  title: string;
  description: string;
  submitLabel: string;
  pending: boolean;
  error?: string | null;
  onSubmit: (credentials: { email: string; password: string }) => void;
  footer: { question: string; linkLabel: string; href: string };
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-2">
        <h1 className="font-serif text-3xl">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ email, password });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Un momento…" : submitLabel}
        </Button>
      </form>

      <p className="text-muted-foreground text-sm">
        {footer.question}{" "}
        <Link className="text-foreground underline" href={footer.href}>
          {footer.linkLabel}
        </Link>
      </p>
    </main>
  );
}
