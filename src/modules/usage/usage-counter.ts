/**
 * Dónde se cuenta el uso de cada día. Siempre en el servidor (PRD §39).
 *
 * Un sujeto es una clave opaca: `user:<id>` para quien tiene cuenta, y para
 * el anónimo una huella de su cookie y otra de su IP (docs/usage.md §5).
 * Varias claves cuentan como una sola persona: el uso es el mayor de ellas,
 * y consumir las incrementa todas.
 */
export interface UsageCounter {
  /** Lo que ya se ha usado hoy: el mayor de los sujetos. */
  used(subjects: readonly string[], day: string): Promise<number>;

  /**
   * Suma uno si queda cupo, en una sola operación atómica.
   *
   * Dos peticiones a la vez no pueden pasar las dos con el último documento
   * del día: comprobar y sumar por separado lo permitiría.
   */
  consume(
    subjects: readonly string[],
    day: string,
    limit: number,
  ): Promise<{ readonly allowed: boolean; readonly used: number }>;
}
