import type { Scale } from "../geometry/scale";
import type { Millimeters } from "../geometry/units";
import type { PrintLayout } from "../printing/print-layout";
import { PdfResourceLimitError } from "./errors";

/**
 * Parte del documento que corresponde a una pieza.
 *
 * Una piñata se imprime en un solo documento, no en uno por pieza: el usuario
 * descarga un archivo (PRD §18, AC-13). Cada sección aporta las hojas de su
 * pieza y su etiqueta las identifica, porque el identificador de retícula
 * `A1` se repite en todas.
 */
export type PrintSection = {
  readonly label: string;
  readonly layout: PrintLayout;
};

/**
 * Datos de la hoja de instrucciones.
 *
 * Ver docs/PRD.md §19. El contenido es el que el usuario necesita antes de
 * empezar a recortar: qué está imprimiendo y a qué escala.
 */
export type PrintDocumentCover = {
  readonly title: string;
  readonly width: Millimeters;
  readonly height: Millimeters;
  readonly depth: Millimeters;
  readonly paper: string;
  readonly scale: Scale;
};

export type PrintDocument = {
  readonly cover?: PrintDocumentCover;
  readonly sections: readonly PrintSection[];
};

/**
 * Documento listo para entregar al usuario.
 *
 * No sabe cómo se entrega: descargarlo, guardarlo en object storage o servirlo
 * por una URL temporal son decisiones de la capa de aplicación.
 * Ver docs/pdf.md §62 y §63.
 */
export type PrintableDocument = {
  readonly fileName: string;
  readonly contentType: string;
  readonly pageCount: number;
  readonly bytes: Uint8Array;
};

export type PdfDocumentMetadata = {
  readonly title: string;
  readonly subject: string;
  readonly creator: string;
};

export type PrintRenderOptions = {
  readonly metadata?: Partial<PdfDocumentMetadata>;
  readonly fileName?: string;
  /**
   * Fecha declarada en el documento.
   *
   * Es un parámetro y no un `new Date()` interno para que una misma entrada
   * pueda producir la misma salida cuando se necesita reproducibilidad.
   * Ver docs/pdf.md §72.
   */
  readonly creationDate?: Date;
};

/**
 * Traduce un documento ya calculado a un archivo imprimible.
 *
 * La interfaz existe para que la librería de PDF sea sustituible sin tocar el
 * dominio, y para que puedan convivir otras salidas —SVG para previsualizar o
 * depurar— con el mismo contrato. Ver docs/printing.md §66, §67 y §68.
 */
export interface PrintRenderer {
  render(
    document: PrintDocument,
    options?: PrintRenderOptions,
  ): Promise<PrintableDocument>;
}

export const PDF_CONTENT_TYPE = "application/pdf";

export const DEFAULT_PDF_FILE_NAME = "pinata-template.pdf";

/** Ver docs/pdf.md §36. No debe contener datos del usuario. */
export const DEFAULT_PDF_METADATA: PdfDocumentMetadata = {
  title: "Piñata Maker Template",
  subject: "Printable Piñata Template",
  creator: "Piñata Maker",
};

/**
 * Límites de tamaño del documento.
 *
 * Una piñata de 800 × 1000 × 200 mm en A4 ocupa unas cincuenta hojas; estos
 * techos dejan margen de sobra para cualquier caso real y evitan que una
 * geometría degenerada agote la memoria del proceso. Ver docs/pdf.md §74.
 */
export const MAX_DOCUMENT_PAGES = 500;

export const MAX_STROKES_PER_PAGE = 20_000;

export function documentPageCount(document: PrintDocument): number {
  const template = document.sections.reduce(
    (total, section) => total + section.layout.pages.length,
    0,
  );

  return template + (document.cover ? 1 : 0);
}

export function assertWithinDocumentLimits(document: PrintDocument): void {
  const pages = documentPageCount(document);

  if (pages > MAX_DOCUMENT_PAGES) {
    throw new PdfResourceLimitError(
      `A printable document supports at most ${MAX_DOCUMENT_PAGES} pages, this one requires ${pages}.`,
    );
  }
}

export function assertWithinPageLimits(
  pageLabel: string,
  strokeCount: number,
): void {
  if (strokeCount > MAX_STROKES_PER_PAGE) {
    throw new PdfResourceLimitError(
      `Page ${pageLabel} contains ${strokeCount} strokes, above the supported limit of ${MAX_STROKES_PER_PAGE}.`,
    );
  }
}

/**
 * Nombre de archivo seguro y legible.
 *
 * El nombre puede acabar en una cabecera HTTP o en una ruta del sistema de
 * archivos, así que no puede construirse a partir de input sin validar.
 * Ver docs/pdf.md §60 y §61.
 */
export function sanitizePdfFileName(name: string): string {
  const base = name
    .replace(/\.pdf$/i, "")
    .replace(/[^\p{Letter}\p{Number}._-]+/gu, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 100);

  return `${base.length > 0 ? base : "pinata-template"}.pdf`;
}
