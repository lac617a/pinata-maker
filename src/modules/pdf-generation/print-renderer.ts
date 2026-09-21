import type { Polygon } from "@/modules/geometry/polygon";
import type { Scale } from "@/modules/geometry/scale";
import type { Millimeters } from "@/modules/geometry/units";
import type { PrintLayout } from "@/modules/printing/print-layout";

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
  /** La figura dibujada dentro de la pieza, si la lleva. */
  readonly artwork?: SectionArtwork;
  /**
   * Qué se imprime en cada hoja.
   *
   * `PIECE`: una pieza recortable, con su contorno, sus pliegues y la regla
   * de calibración donde quepa. `POSTER`: solo la imagen; no hay contorno
   * que trazar y la regla va en la hoja de resumen, porque aquí caería
   * encima de la figura. Ver docs/pdf.md §94.
   */
  readonly kind?: "PIECE" | "POSTER";
};

/** Formatos que el documento sabe incrustar: los mismos que se suben. */
export type EmbeddedImageFormat = "PNG" | "JPEG" | "WEBP";

export type EmbeddedImage = {
  readonly bytes: Uint8Array;
  readonly format: EmbeddedImageFormat;
};

/**
 * La imagen de origen dibujada dentro de una pieza.
 *
 * Es un elemento visual independiente y nunca geometría: se dibuja debajo
 * de los trazos y recortada por la silueta, así que la línea de corte sigue
 * encima y se ve entera (docs/pdf.md §24).
 *
 * Todas las medidas en mm y en coordenadas globales de la pieza, las mismas
 * que usa su reparto en hojas.
 */
export type SectionArtwork = {
  readonly image: EmbeddedImage;
  readonly placement: {
    readonly x: Millimeters;
    readonly y: Millimeters;
    readonly width: Millimeters;
    readonly height: Millimeters;
  };
  /** Volteada sobre su propio eje vertical: la espalda de la figura. */
  readonly mirrored: boolean;
  /** Silueta que recorta la imagen. */
  readonly clip: readonly Polygon[];
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

/**
 * Hoja de resumen del póster: ajustes, instrucciones, mapa de montaje y la
 * regla para comprobar la escala. Ver docs/pdf.md §94.
 */
export type PosterCover = {
  readonly kind: "POSTER";
  readonly title: string;
  readonly width: Millimeters;
  readonly height: Millimeters;
  readonly paper: string;
  readonly image: EmbeddedImage;
  /**
   * Dónde va la imagen entera, en mm del póster. Con un recorte se sale del
   * póster y el mapa la recorta igual que las hojas (docs/pdf.md §95). Sin
   * él, ocupa el póster entero.
   */
  readonly placement?: SectionArtwork["placement"];
};

export type PrintDocument = {
  readonly cover?: PrintDocumentCover | PosterCover;
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

/**
 * Versión del generador de documentos.
 *
 * Se guarda con cada archivo generado para poder relacionar un PDF que el
 * usuario ya imprimió con las reglas que lo produjeron. Sin ella, un cambio
 * en el dibujo dejaría los documentos antiguos sin explicación.
 * Ver docs/storage.md §54.
 */
export const PDF_GENERATOR_VERSION = "1.1";

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

/**
 * Peso máximo de una imagen incrustada.
 *
 * La subida ya limita el original a 10 MB (`IMAGE_LIMITS`); este techo es la
 * defensa del propio documento, que no debe cargar en memoria cualquier cosa
 * que le llegue. Ver docs/pdf.md §74.
 */
export const MAX_EMBEDDED_IMAGE_BYTES = 15 * 1024 * 1024;

export function documentPageCount(document: PrintDocument): number {
  const template = document.sections.reduce(
    (total, section) => total + section.layout.pages.length,
    0,
  );

  return template + (document.cover ? 1 : 0);
}

export function assertWithinDocumentLimits(document: PrintDocument): void {
  for (const section of document.sections) {
    const bytes = section.artwork?.image.bytes.byteLength ?? 0;

    if (bytes > MAX_EMBEDDED_IMAGE_BYTES) {
      throw new PdfResourceLimitError(
        `Section ${section.label} embeds an image of ${bytes} bytes, above the limit of ${MAX_EMBEDDED_IMAGE_BYTES}.`,
      );
    }
  }

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
