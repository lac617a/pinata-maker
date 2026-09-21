import type {
  PrintableDocument,
  PrintDocument,
  PrintRenderer,
  PrintSection,
} from "@/modules/pdf-generation/print-renderer";
import type {
  PaperFormat,
  PaperOrientation,
} from "@/modules/printing/paper-format";
import {
  createPrintLayout,
  DEFAULT_PRINT_CONFIGURATION,
  type PrintConfiguration,
} from "@/modules/printing/print-layout";
import type { Template } from "@/modules/templates/template";

export type GeneratePrintableDocumentInput = {
  readonly template: Template;
  /** La implementación concreta la decide quien llama, no este caso de uso. */
  readonly renderer: PrintRenderer;
  readonly print?: PrintConfiguration;
  readonly fileName?: string;
  readonly creationDate?: Date;
};

/**
 * Compone el documento imprimible de una plantilla completa.
 *
 * Cada pieza se reparte en hojas por su cuenta y entra como una sección del
 * mismo documento: el usuario descarga un archivo, no dieciocho
 * (PRD §18, AC-13).
 *
 * No calcula geometría ni reparto: encadena el dominio de impresión con el
 * renderer. Ver docs/architecture.md §6.
 */
export async function generatePrintableDocument(
  input: GeneratePrintableDocumentInput,
): Promise<PrintableDocument> {
  const configuration = input.print ?? DEFAULT_PRINT_CONFIGURATION;

  const sections: PrintSection[] = input.template.pieces.map((piece) => ({
    label: piece.id,
    layout: createPrintLayout(piece.geometry, configuration),
  }));

  const document: PrintDocument = {
    cover: {
      title: input.template.name,
      width: input.template.width,
      height: input.template.height,
      depth: input.template.depth,
      paper: describePaper(
        configuration.paper.format,
        configuration.paper.orientation,
      ),
      scale: sections[0].layout.scale,
    },
    sections,
  };

  return input.renderer.render(document, {
    fileName: input.fileName ?? `${input.template.name}.pdf`,
    creationDate: input.creationDate,
  });
}

/**
 * Cuántas hojas ocupará el documento, sin generarlo.
 *
 * Permite avisar del coste en papel antes de que el usuario espere por un
 * PDF de cincuenta hojas. Ver docs/template.md §120 y docs/PRD.md §20.
 */
export function countPrintableSheets(
  template: Template,
  print: PrintConfiguration = DEFAULT_PRINT_CONFIGURATION,
): number {
  const templateSheets = template.pieces.reduce(
    (total, piece) =>
      total + createPrintLayout(piece.geometry, print).pages.length,
    0,
  );

  // La hoja de instrucciones cuenta: también se imprime.
  return templateSheets + 1;
}

function describePaper(
  format: PaperFormat,
  orientation: PaperOrientation,
): string {
  return `${format} ${orientation === "PORTRAIT" ? "vertical" : "horizontal"}`;
}
