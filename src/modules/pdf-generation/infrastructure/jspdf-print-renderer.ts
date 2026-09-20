import { jsPDF } from "jspdf";

import type { Polygon } from "../../geometry/polygon";
import {
  PRINT_SCALE_ACTUAL_SIZE,
  type PrintLayout,
  type PrintPage,
} from "../../printing/print-layout";
import {
  InvalidPdfGeometryError,
  PdfRenderError,
  UnsupportedPdfFeatureError,
} from "../errors";
import {
  describePage,
  type PageDrawing,
  type PageStroke,
  type PageText,
} from "../page-drawing";
import { millimetersToPoints, pointsEqual, type Points } from "../pdf-units";
import { DOCUMENT_FONT, STROKE_STYLES, TEXT_SIZES } from "../pdf-style";
import {
  assertWithinDocumentLimits,
  assertWithinPageLimits,
  DEFAULT_PDF_FILE_NAME,
  DEFAULT_PDF_METADATA,
  PDF_CONTENT_TYPE,
  sanitizePdfFileName,
  type PrintableDocument,
  type PrintRenderer,
  type PrintRenderOptions,
} from "../print-renderer";

/**
 * Implementación del renderer sobre jsPDF.
 *
 * Es el único archivo del proyecto que conoce la librería. Todo lo que sabe
 * hacer es representar el plano de dibujo que recibe: no calcula tiling, ni
 * escala, ni decide cuántas páginas hay. Ver docs/pdf.md §51 a §53.
 *
 * jsPDF trabaja con el origen arriba-izquierda y la Y hacia abajo, la misma
 * convención que el dominio, de modo que aquí no hace falta invertir el eje.
 * Que eso sea cierto es un detalle de esta librería, no del formato: otro
 * adaptador podría necesitar la transformación. Ver docs/pdf.md §16 y §18.
 */
export class JsPdfPrintRenderer implements PrintRenderer {
  async render(
    layout: PrintLayout,
    options: PrintRenderOptions = {},
  ): Promise<PrintableDocument> {
    assertActualSize(layout);
    assertWithinDocumentLimits(layout);

    const drawings = layout.pages.map((page) => {
      const drawing = describePage(page);
      assertWithinPageLimits(drawing.label, drawing.strokes.length);
      return drawing;
    });

    if (drawings.length === 0) {
      throw new InvalidPdfGeometryError(
        "A printable document requires at least one page.",
      );
    }

    const document = this.build(drawings, layout.pages, options);

    return {
      fileName: sanitizePdfFileName(options.fileName ?? DEFAULT_PDF_FILE_NAME),
      contentType: PDF_CONTENT_TYPE,
      pageCount: drawings.length,
      bytes: document,
    };
  }

  private build(
    drawings: readonly PageDrawing[],
    pages: readonly PrintPage[],
    options: PrintRenderOptions,
  ): Uint8Array {
    try {
      const doc = new jsPDF({
        unit: "pt",
        format: paperFormatInPoints(drawings[0]),
        orientation: orientationOf(drawings[0]),
        // La plantilla es geometría vectorial ligera: comprimir añadiría una
        // dependencia de zlib sin ganancia apreciable de tamaño.
        compress: false,
      });

      doc.setProperties({ ...DEFAULT_PDF_METADATA, ...options.metadata });

      if (options.creationDate) {
        doc.setCreationDate(options.creationDate);
      }

      drawings.forEach((drawing, index) => {
        if (index > 0) {
          doc.addPage(paperFormatInPoints(drawing), orientationOf(drawing));
        }

        drawPage(doc, drawing);
      });

      assertRenderedPageSizes(doc, pages);

      return new Uint8Array(doc.output("arraybuffer"));
    } catch (error) {
      if (
        error instanceof InvalidPdfGeometryError ||
        error instanceof UnsupportedPdfFeatureError
      ) {
        throw error;
      }

      throw new PdfRenderError(
        `The PDF library failed to produce the document: ${describeCause(error)}`,
        { cause: error },
      );
    }
  }
}

/**
 * El MVP solo imprime a tamaño real.
 *
 * Si algún día el layout declara otra escala, el renderer debe fallar en lugar
 * de ignorarla: imprimir al 100 % un documento que pedía otra escala produce
 * una piñata del tamaño equivocado. Ver docs/pdf.md §44 y §75.
 */
function assertActualSize(layout: PrintLayout): void {
  if (layout.scale !== PRINT_SCALE_ACTUAL_SIZE) {
    throw new UnsupportedPdfFeatureError(
      `The renderer only supports actual size printing, the layout declares a scale of ${layout.scale}.`,
    );
  }
}

function paperFormatInPoints(drawing: PageDrawing): [Points, Points] {
  return [
    millimetersToPoints(drawing.paper.width),
    millimetersToPoints(drawing.paper.height),
  ];
}

/**
 * jsPDF puede reordenar los lados del formato según la orientación, así que se
 * declara la que corresponde a las dimensiones del layout en lugar de dejar
 * que la deduzca. Ver docs/pdf.md §12.
 */
function orientationOf(drawing: PageDrawing): "portrait" | "landscape" {
  return drawing.paper.width > drawing.paper.height ? "landscape" : "portrait";
}

function drawPage(doc: jsPDF, drawing: PageDrawing): void {
  for (const stroke of drawing.strokes) {
    drawStroke(doc, stroke);
  }

  doc.setLineDashPattern([], 0);

  for (const text of drawing.texts) {
    drawText(doc, text);
  }
}

function drawStroke(doc: jsPDF, stroke: PageStroke): void {
  const style = STROKE_STYLES[stroke.role];

  doc.setLineWidth(millimetersToPoints(style.width));
  doc.setLineDashPattern(
    style.dash ? style.dash.map(millimetersToPoints) : [],
    0,
  );

  const [start, ...rest] = pathInPoints(stroke.path);

  doc.lines(
    rest.map(([x, y], index) => {
      const previous = index === 0 ? start : rest[index - 1];
      return [x - previous[0], y - previous[1]];
    }),
    start[0],
    start[1],
    [1, 1],
    "S",
    stroke.path.closed,
  );
}

function drawText(doc: jsPDF, text: PageText): void {
  doc.setFont(DOCUMENT_FONT, "normal");
  doc.setFontSize(millimetersToPoints(TEXT_SIZES[text.role]));

  doc.text(
    text.text,
    millimetersToPoints(text.position.x),
    millimetersToPoints(text.position.y),
    { align: horizontalAlignment(text.anchor), baseline: "middle" },
  );
}

function horizontalAlignment(
  anchor: PageText["anchor"],
): "left" | "center" | "right" {
  switch (anchor) {
    case "START":
      return "left";
    case "CENTER":
      return "center";
    case "END":
      return "right";
  }
}

function pathInPoints(path: Polygon): [Points, Points][] {
  if (path.points.length < 2) {
    throw new InvalidPdfGeometryError(
      `A stroke requires at least two points, received ${path.points.length}.`,
    );
  }

  return path.points.map((point) => [
    millimetersToPoints(point.x),
    millimetersToPoints(point.y),
  ]);
}

/**
 * Comprueba que cada hoja del documento mide lo que pedía el layout.
 *
 * Es la verificación que detecta un error de conversión antes de que el
 * usuario gaste papel. Ver docs/pdf.md §45, §46 y §48.
 */
function assertRenderedPageSizes(
  doc: jsPDF,
  pages: readonly PrintPage[],
): void {
  pages.forEach((page, index) => {
    doc.setPage(index + 1);

    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const expectedWidth = millimetersToPoints(page.paper.width);
    const expectedHeight = millimetersToPoints(page.paper.height);

    if (
      !pointsEqual(width, expectedWidth) ||
      !pointsEqual(height, expectedHeight)
    ) {
      throw new InvalidPdfGeometryError(
        `Page ${page.id} measures ${width} × ${height} pt, expected ${expectedWidth} × ${expectedHeight} pt.`,
      );
    }
  });
}

function describeCause(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
