/**
 * Errores del dominio de impresión.
 *
 * Representan configuraciones físicamente imposibles, no fallos del renderer
 * ni de la librería de PDF. Ver docs/printing.md §82.
 */

export class InvalidPaperFormatError extends Error {
  readonly code = "INVALID_PAPER_FORMAT";

  constructor(message: string) {
    super(message);
    this.name = "InvalidPaperFormatError";
  }
}

export class InvalidMarginError extends Error {
  readonly code = "INVALID_MARGIN";

  constructor(message: string) {
    super(message);
    this.name = "InvalidMarginError";
  }
}

export class InvalidOverlapError extends Error {
  readonly code = "INVALID_OVERLAP";

  constructor(message: string) {
    super(message);
    this.name = "InvalidOverlapError";
  }
}

export class EmptyPrintableAreaError extends Error {
  readonly code = "EMPTY_PRINTABLE_AREA";

  constructor(message: string) {
    super(message);
    this.name = "EmptyPrintableAreaError";
  }
}
