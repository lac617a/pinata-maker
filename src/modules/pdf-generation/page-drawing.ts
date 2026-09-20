import { translatePoint, type Point, type Vector } from "../geometry/point";
import { translatePolygon, type Polygon } from "../geometry/polygon";
import type { Millimeters } from "../geometry/units";
import type { AlignmentMark, PageEdge } from "../printing/alignment";
import type { CalibrationMark } from "../printing/calibration";
import type { PaperSize } from "../printing/paper-format";
import type { PrintPage } from "../printing/print-layout";

/**
 * Significado físico de un trazo.
 *
 * El estilo con el que se dibuja es una decisión del renderer; la semántica
 * pertenece al layout. Ver docs/pdf.md §25.
 */
export type StrokeRole =
  | "CONTOUR"
  | "HOLE"
  | "CUT"
  | "FOLD"
  | "ALIGNMENT"
  | "CALIBRATION";

export type TextRole =
  | "PAGE_LABEL"
  | "ALIGNMENT_LABEL"
  | "CALIBRATION_LABEL"
  | "PRINT_WARNING"
  | "COVER_TITLE"
  | "COVER_TEXT";

export type PageStroke = {
  readonly role: StrokeRole;
  readonly path: Polygon;
};

/**
 * Texto auxiliar de la hoja.
 *
 * `position` marca el centro vertical del texto y el punto al que se ancla
 * horizontalmente. Medir la cadena requiere conocer la fuente, así que esa
 * parte se deja al renderer. Ver docs/pdf.md §40.
 */
export type PageText = {
  readonly role: TextRole;
  readonly text: string;
  readonly position: Point;
  readonly anchor: "START" | "CENTER" | "END";
};

/**
 * Qué debe dibujarse en una hoja, en milímetros y en coordenadas del papel.
 *
 * Existe para que la traducción de un `PrintPage` a trazos concretos pueda
 * probarse sin generar un PDF, y para que la librería solo tenga que dibujar
 * lo que recibe. Sigue siendo una representación física: la conversión a
 * puntos ocurre después, en el adaptador. Ver docs/pdf.md §79 y §83.
 */
export type PageDrawing = {
  readonly label: string;
  readonly paper: PaperSize;
  readonly strokes: readonly PageStroke[];
  readonly texts: readonly PageText[];
};

/**
 * Semilongitud de los brazos de la cruz de alineación.
 *
 * Con el solapamiento recomendado la marca cae a 5 mm del borde imprimible,
 * de modo que la cruz no puede salirse de él.
 */
export const ALIGNMENT_ARM_MM: Millimeters = 3;

/** Semialtura de las marcas que cierran los extremos de la regla. */
export const CALIBRATION_TICK_MM: Millimeters = 2;

/** Separación entre una marca y su etiqueta. */
export const LABEL_OFFSET_MM: Millimeters = 2.5;

/** Distancia del pie de página al borde inferior del área imprimible. */
export const FOOTER_INSET_MM: Millimeters = 2.5;

/**
 * Advertencia impresa en cada hoja.
 *
 * El documento no puede impedir que el visor o el driver reescalen la
 * impresión, así que el aviso viaja con el papel y no solo en la interfaz.
 * Ver docs/printing.md §71, §72 y §73.
 */
export const PRINT_SCALE_WARNING = "Imprimir al 100 % - no ajustar a página";

/**
 * Traduce una hoja del layout a los trazos que la representan.
 *
 * No decide nada del reparto: posiciones, marcas y etiquetas vienen dadas. Lo
 * único que añade son las formas con las que se dibujan —la cruz de una
 * marca, los topes de la regla— y el desplazamiento del área imprimible sobre
 * el papel. Ver docs/pdf.md §33, §34 y §51.
 */
export function describePage(
  page: PrintPage,
  /**
   * Pieza a la que pertenece la hoja.
   *
   * El identificador de retícula `A1` se repite en todas las piezas, así que
   * en un documento con dieciocho piezas no basta por sí solo.
   */
  sectionLabel?: string,
): PageDrawing {
  const toPaper: Vector = {
    x: page.printableOrigin.x,
    y: page.printableOrigin.y,
  };

  const place = (polygon: Polygon): Polygon =>
    translatePolygon(polygon, toPaper);

  const strokes: PageStroke[] = [
    ...page.geometry.outerContours.map((path) =>
      stroke("CONTOUR", place(path)),
    ),
    ...page.geometry.holes.map((path) => stroke("HOLE", place(path))),
    ...page.geometry.cutLines.map((line) =>
      stroke("CUT", place(line.geometry)),
    ),
    ...page.geometry.foldLines.map((line) =>
      stroke("FOLD", place(line.geometry)),
    ),
    ...page.alignmentMarks.flatMap((mark) =>
      alignmentStrokes(translatePoint(mark.position, toPaper)),
    ),
  ];

  const texts: PageText[] = [
    ...page.alignmentMarks.map((mark) =>
      alignmentLabel(mark, translatePoint(mark.position, toPaper)),
    ),
    ...footerTexts(page, sectionLabel),
  ];

  if (page.calibrationMark) {
    const origin = translatePoint(page.calibrationMark.position, toPaper);

    strokes.push(...calibrationStrokes(page.calibrationMark, origin));
    texts.push(calibrationLabel(page.calibrationMark, origin));
  }

  return {
    label: sectionLabel ? `${sectionLabel} ${page.id}` : page.id,
    paper: page.paper,
    strokes,
    texts,
  };
}

function stroke(role: StrokeRole, path: Polygon): PageStroke {
  return { role, path };
}

/** Una cruz: dos trazos rectos que se cortan en la posición de la marca. */
function alignmentStrokes(center: Point): PageStroke[] {
  return [
    stroke("ALIGNMENT", {
      points: [
        { x: center.x - ALIGNMENT_ARM_MM, y: center.y },
        { x: center.x + ALIGNMENT_ARM_MM, y: center.y },
      ],
      closed: false,
    }),
    stroke("ALIGNMENT", {
      points: [
        { x: center.x, y: center.y - ALIGNMENT_ARM_MM },
        { x: center.x, y: center.y + ALIGNMENT_ARM_MM },
      ],
      closed: false,
    }),
  ];
}

/**
 * La etiqueta nombra la hoja vecina, no la marca: al montar el molde lo que el
 * usuario busca es con qué papel se solapa este borde.
 */
function alignmentLabel(mark: AlignmentMark, center: Point): PageText {
  const offset = ALIGNMENT_ARM_MM + LABEL_OFFSET_MM;

  const placement: Record<
    PageEdge,
    { position: Point; anchor: PageText["anchor"] }
  > = {
    TOP: { position: { x: center.x, y: center.y + offset }, anchor: "CENTER" },
    BOTTOM: {
      position: { x: center.x, y: center.y - offset },
      anchor: "CENTER",
    },
    LEFT: { position: { x: center.x + offset, y: center.y }, anchor: "START" },
    RIGHT: { position: { x: center.x - offset, y: center.y }, anchor: "END" },
  };

  return {
    role: "ALIGNMENT_LABEL",
    text: mark.connectsTo,
    ...placement[mark.edge],
  };
}

/**
 * La regla y sus dos topes.
 *
 * El trazo mide exactamente la longitud declarada: es la referencia que el
 * usuario comprueba con una regla real. Ver docs/pdf.md §31.
 */
function calibrationStrokes(
  mark: CalibrationMark,
  origin: Point,
): PageStroke[] {
  const end = origin.x + mark.length;

  return [
    stroke("CALIBRATION", {
      points: [
        { x: origin.x, y: origin.y },
        { x: end, y: origin.y },
      ],
      closed: false,
    }),
    ...[origin.x, end].map((x) =>
      stroke("CALIBRATION", {
        points: [
          { x, y: origin.y - CALIBRATION_TICK_MM },
          { x, y: origin.y + CALIBRATION_TICK_MM },
        ],
        closed: false,
      }),
    ),
  ];
}

/**
 * El texto acompaña a la regla, pero la referencia física es la línea.
 * Ver docs/pdf.md §32.
 */
function calibrationLabel(mark: CalibrationMark, origin: Point): PageText {
  return {
    role: "CALIBRATION_LABEL",
    text: `${formatMillimeters(mark.length)} mm`,
    position: {
      x: origin.x + mark.length / 2,
      y: origin.y - LABEL_OFFSET_MM,
    },
    anchor: "CENTER",
  };
}

/**
 * Identidad de la hoja y advertencia de escala.
 *
 * Van dentro del área imprimible y no en el margen: el margen no está
 * garantizado por el hardware de la impresora, y perder la etiqueta de una
 * hoja rompe el montaje. Ver docs/printing.md §12 y docs/PRD.md §14.
 */
function footerTexts(page: PrintPage, sectionLabel?: string): PageText[] {
  const baseline =
    page.printableOrigin.y + page.printableArea.height - FOOTER_INSET_MM;

  const identity = `${page.id} (${page.pageNumber} / ${page.totalPages})`;

  return [
    {
      role: "PAGE_LABEL",
      text: sectionLabel ? `${sectionLabel} · ${identity}` : identity,
      position: { x: page.printableOrigin.x, y: baseline },
      anchor: "START",
    },
    {
      role: "PRINT_WARNING",
      text: PRINT_SCALE_WARNING,
      position: {
        x: page.printableOrigin.x + page.printableArea.width,
        y: baseline,
      },
      anchor: "END",
    },
  ];
}

/** Margen de la hoja de instrucciones. No lleva geometría que preservar. */
const COVER_MARGIN_MM: Millimeters = 20;

/** Separación entre líneas de texto de la hoja de instrucciones. */
const COVER_LINE_MM: Millimeters = 7;

/**
 * Inventario de una pieza para la hoja de instrucciones.
 *
 * Lo construye quien compone el documento, porque el número de hojas de cada
 * pieza sale de su reparto y no de su geometría.
 */
export type CoverEntry = {
  readonly label: string;
  readonly sheets: number;
};

export type CoverContent = {
  readonly title: string;
  readonly width: Millimeters;
  readonly height: Millimeters;
  readonly depth: Millimeters;
  readonly paper: string;
  readonly scale: number;
  readonly entries: readonly CoverEntry[];
};

/**
 * Hoja de instrucciones del documento.
 *
 * Ver docs/PRD.md §19. Da al usuario lo que necesita antes de recortar: qué
 * está imprimiendo, a qué escala y cuántas hojas ocupa cada pieza. Sin ella,
 * un documento de cincuenta hojas de siluetas sueltas es difícil de usar.
 *
 * No lleva geometría: nada de lo que hay aquí se recorta.
 */
export function describeCoverPage(
  content: CoverContent,
  paper: PaperSize,
): PageDrawing {
  const left = COVER_MARGIN_MM;
  let baseline = COVER_MARGIN_MM;

  const line = (
    text: string,
    role: TextRole = "COVER_TEXT",
    indent = 0,
  ): PageText => {
    const at: PageText = {
      role,
      text,
      position: { x: left + indent, y: baseline },
      anchor: "START",
    };

    baseline += COVER_LINE_MM;

    return at;
  };

  const totalSheets = content.entries.reduce(
    (total, entry) => total + entry.sheets,
    0,
  );

  const texts: PageText[] = [
    line(content.title, "COVER_TITLE"),
    line(""),
    line(
      `Figura: ${formatMillimeters(content.width)} × ${formatMillimeters(content.height)} × ${formatMillimeters(content.depth)} mm`,
    ),
    line(`Papel: ${content.paper}`),
    line(`Escala: ${content.scale * 100} %`),
    line(`Piezas: ${content.entries.length} en ${totalSheets} hojas`),
    line(""),
    line("Antes de imprimir", "COVER_TITLE"),
    line(PRINT_SCALE_WARNING),
    line("Comprueba con una regla que la marca de 100 mm mide 100 mm."),
    line("Si no mide 100 mm, el visor o la impresora están reescalando."),
    line(""),
    line("Piezas", "COVER_TITLE"),
    ...content.entries.map((entry) =>
      line(
        `${entry.label} — ${entry.sheets} ${entry.sheets === 1 ? "hoja" : "hojas"}`,
        "COVER_TEXT",
        5,
      ),
    ),
  ];

  return { label: "INSTRUCCIONES", paper, strokes: [], texts };
}

/** `100` en lugar de `100.0`, y `97.5` cuando la medida lo necesita. */
function formatMillimeters(value: Millimeters): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
