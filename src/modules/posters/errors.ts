/**
 * Errores del póster.
 *
 * Ver docs/PRD.md §23: la interfaz necesita distinguirlos para decir algo
 * útil.
 */

/** La medida pedida no da un póster que se pueda imprimir en hojas. */
export class InvalidPosterSizeError extends Error {
  readonly code = "INVALID_POSTER_SIZE";

  constructor(message: string) {
    super(message);
    this.name = "InvalidPosterSizeError";
  }
}
