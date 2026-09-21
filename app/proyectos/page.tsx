import type { Metadata } from "next";

import { ProjectsPanel } from "@/components/projects/projects-panel";
import { DeleteAccount } from "@/components/session/delete-account";

export const metadata: Metadata = { title: "Proyectos · Piñata Maker" };

export default function Page() {
  return (
    <main className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-serif text-3xl">Tus proyectos</h1>
        <p className="text-muted-foreground text-sm">
          Un proyecto por figura: su imagen, sus plantillas publicadas y los
          documentos que hayas generado.
        </p>
      </div>

      <ProjectsPanel />

      <DeleteAccount />
    </main>
  );
}
