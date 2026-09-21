import { jsPDF } from "jspdf";

import type { Polygon } from "@/modules/geometry/polygon";
import {
  InvalidPdfGeometryError,
  PdfRenderError,
  UnsupportedPdfFeatureError,
} from "@/modules/pdf-generation/errors";
import {
  type AffineTransform,
  orientationTransform,
} from "@/modules/pdf-generation/image-orientation";
import {
  type CoverEntry,
  describeCoverPage,
  describePage,
  describePosterCover,
  type PageDrawing,
  type PageImage,
  type PageStroke,
  type PageText,
} from "@/modules/pdf-generation/page-drawing";
import {
  DOCUMENT_FONT,
  STROKE_STYLES,
  TEXT_SIZES,
} from "@/modules/pdf-generation/pdf-style";
import {
  millimetersToPoints,
  type Points,
  pointsEqual,
} from "@/modules/pdf-generation/pdf-units";
import {
  assertWithinDocumentLimits,
  assertWithinPageLimits,
  DEFAULT_PDF_FILE_NAME,
  DEFAULT_PDF_METADATA,
  type EmbeddedImage,
  PDF_CONTENT_TYPE,
  type PrintableDocument,
  type PrintDocument,
  type PrintRenderer,
  type PrintRenderOptions,
  sanitizePdfFileName,
} from "@/modules/pdf-generation/print-renderer";
import { PRINT_SCALE_ACTUAL_SIZE } from "@/modules/printing/print-layout";

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
    document: PrintDocument,
    options: PrintRenderOptions = {},
  ): Promise<PrintableDocument> {
    for (const section of document.sections) {
      assertActualSize(section.label, section.layout.scale);
    }

    assertWithinDocumentLimits(document);

    const drawings = describeDocument(document);

    if (drawings.length === 0) {
      throw new InvalidPdfGeometryError(
        "A printable document requires at least one page.",
      );
    }

    for (const drawing of drawings) {
      assertWithinPageLimits(drawing.label, drawing.strokes.length);
    }

    return {
      fileName: sanitizePdfFileName(options.fileName ?? DEFAULT_PDF_FILE_NAME),
      contentType: PDF_CONTENT_TYPE,
      pageCount: drawings.length,
      bytes: this.build(drawings, options),
    };
  }

  private build(
    drawings: readonly PageDrawing[],
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

      const aliases = new ImageAliases();

      drawings.forEach((drawing, index) => {
        if (index > 0) {
          doc.addPage(paperFormatInPoints(drawing), orientationOf(drawing));
        }

        drawPage(doc, drawing, aliases);
      });

      assertRenderedPageSizes(doc, drawings);

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
 * Traduce el documento entero a planos de dibujo.
 *
 * La hoja de instrucciones toma el papel de la primera sección: el documento
 * se imprime de una vez y mezclar formatos obligaría al usuario a cambiar la
 * bandeja a mitad de trabajo.
 */
function describeDocument(document: PrintDocument): PageDrawing[] {
  const pages = document.sections.flatMap((section) =>
    section.layout.pages.map((page) =>
      describePage(
        page,
        section.label,
        section.artwork,
        section.kind,
        section.trimMarks,
      ),
    ),
  );

  if (!document.cover) {
    return pages;
  }

  const paper = document.sections[0].layout.pages[0].paper;

  // Solo el resumen del póster declara `kind`: la hoja de instrucciones de
  // una plantilla no lo necesita.
  if ("kind" in document.cover) {
    return [
      describePosterCover(document.cover, document.sections[0].layout, paper),
      ...pages,
    ];
  }

  const entries: CoverEntry[] = document.sections.map((section) => ({
    label: section.label,
    sheets: section.layout.pages.length,
  }));

  const cover = describeCoverPage(
    { ...document.cover, entries },
    document.sections[0].layout.pages[0].paper,
  );

  return [cover, ...pages];
}

/**
 * El MVP solo imprime a tamaño real.
 *
 * Si algún día el layout declara otra escala, el renderer debe fallar en lugar
 * de ignorarla: imprimir al 100 % un documento que pedía otra escala produce
 * una piñata del tamaño equivocado. Ver docs/pdf.md §44 y §75.
 */
function assertActualSize(label: string, scale: number): void {
  if (scale !== PRINT_SCALE_ACTUAL_SIZE) {
    throw new UnsupportedPdfFeatureError(
      `The renderer only supports actual size printing, section ${label} declares a scale of ${scale}.`,
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

function drawPage(
  doc: jsPDF,
  drawing: PageDrawing,
  aliases: ImageAliases,
): void {
  // Primero la figura: los trazos van encima y la línea de corte se ve
  // entera aunque la imagen llegue hasta el borde. Ver docs/pdf.md §24.
  for (const image of drawing.images) {
    drawImage(doc, image, aliases.of(image.image));
  }

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

/**
 * Una imagen se incrusta una vez y se reutiliza en todas las hojas.
 *
 * La figura de la piñata aparece en docenas de hojas. Sin un alias común
 * jsPDF la incrustaría en cada una y el documento pesaría decenas de megas.
 */
class ImageAliases {
  private readonly known = new Map<EmbeddedImage, string>();

  of(image: EmbeddedImage): string {
    const existing = this.known.get(image);

    if (existing) {
      return existing;
    }

    const alias = `reference-${this.known.size + 1}`;
    this.known.set(image, alias);

    return alias;
  }
}

/**
 * Compresión de las imágenes que jsPDF tiene que volver a escribir.
 *
 * Sin ella, un PNG se incrusta como pixels en crudo: una ilustración de
 * 3000 × 4000 que pesa 0,3 MB daba un PDF de 36 MB. Con `FAST` son 0,08 MB,
 * casi lo mismo que con `SLOW` y en menos tiempo. Un JPEG entra tal cual,
 * ya comprimido, y esto no lo toca. Ver docs/pdf.md §98.
 */
const IMAGE_COMPRESSION = "FAST";

/**
 * La parte de la figura que cae en esta hoja.
 *
 * Dos recortes que se intersecan: el área imprimible, para no invadir los
 * márgenes, y la silueta, para que la imagen no salga de la pieza. La imagen
 * se coloca entera; es el recorte quien decide qué trozo se ve.
 *
 * La espalda se voltea con una matriz sobre el eje vertical de la propia
 * imagen. jsPDF no refleja con un ancho negativo: lo corrompe.
 */
function drawImage(doc: jsPDF, image: PageImage, alias: string): void {
  doc.saveGraphicsState();

  doc.rect(
    millimetersToPoints(image.bounds.x),
    millimetersToPoints(image.bounds.y),
    millimetersToPoints(image.bounds.width),
    millimetersToPoints(image.bounds.height),
    null,
  );
  doc.clip();
  doc.discardPath();

  for (const polygon of image.clip) {
    const [start, ...rest] = pathInPoints(polygon);

    doc.moveTo(start[0], start[1]);

    for (const [x, y] of rest) {
      doc.lineTo(x, y);
    }

    doc.close();
  }

  doc.clip();
  doc.discardPath();

  if (image.mirrored) {
    const axis = millimetersToPoints(image.x + image.width / 2);

    doc.setCurrentTransformationMatrix(doc.Matrix(-1, 0, 0, 1, 2 * axis, 0));
  }

  const target = {
    x: millimetersToPoints(image.x),
    y: millimetersToPoints(image.y),
    width: millimetersToPoints(image.width),
    height: millimetersToPoints(image.height),
  };
  const orientation = image.image.orientation ?? 1;

  if (orientation === 1) {
    doc.addImage(
      image.image.bytes,
      image.image.format,
      target.x,
      target.y,
      target.width,
      target.height,
      alias,
      IMAGE_COMPRESSION,
    );
  } else {
    // Foto de cámara con orientación EXIF: se dibujan los bytes tal cual
    // en el origen y la matriz los gira hasta su sitio (docs/pdf.md §97).
    const { drawWidth, drawHeight, transform } = orientationTransform(
      orientation,
      target,
    );
    const pdf = toPdfSpace(transform, doc.internal.pageSize.getHeight());

    doc.setCurrentTransformationMatrix(
      doc.Matrix(pdf.a, pdf.b, pdf.c, pdf.d, pdf.e, pdf.f),
    );
    doc.addImage(
      image.image.bytes,
      image.image.format,
      0,
      0,
      drawWidth,
      drawHeight,
      alias,
      IMAGE_COMPRESSION,
    );
  }

  doc.restoreGraphicsState();
}

/**
 * La matriz de dibujo, pasada al espacio del PDF.
 *
 * `setCurrentTransformationMatrix` escribe la matriz tal cual en el PDF,
 * cuyo eje y crece hacia arriba, mientras que las coordenadas de jsPDF
 * crecen hacia abajo. Con `F(x, y) = (x, H − y)`, la matriz buscada es
 * `F · T · F`. El espejo de la espalda no lo necesitaba porque solo toca x.
 */
function toPdfSpace(
  transform: AffineTransform,
  pageHeight: number,
): AffineTransform {
  const { a, b, c, d, e, f } = transform;

  return {
    a,
    b: -b,
    c: -c,
    d,
    e: e + c * pageHeight,
    f: pageHeight - f - d * pageHeight,
  };
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
  drawings: readonly PageDrawing[],
): void {
  drawings.forEach((drawing, index) => {
    doc.setPage(index + 1);

    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const expectedWidth = millimetersToPoints(drawing.paper.width);
    const expectedHeight = millimetersToPoints(drawing.paper.height);

    if (
      !pointsEqual(width, expectedWidth) ||
      !pointsEqual(height, expectedHeight)
    ) {
      throw new InvalidPdfGeometryError(
        `Page ${drawing.label} measures ${width} × ${height} pt, expected ${expectedWidth} × ${expectedHeight} pt.`,
      );
    }
  });
}

function describeCause(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
