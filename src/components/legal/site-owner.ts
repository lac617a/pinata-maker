/**
 * Quién está detrás del sitio, para las páginas legales (docs/PRD.md §41).
 *
 * Un solo sitio para estos datos: las cuatro páginas los citan de aquí.
 * Mientras alguno siga entre corchetes, cada página legal enseña un aviso de
 * borrador bien visible: no deben publicarse así (docs/legal.md §2).
 */
export const SITE_OWNER = {
  /** Nombre completo de la persona o razón social de la empresa. */
  name: "[TITULAR]",
  /** Documento de identidad o identificador fiscal. */
  taxId: "[IDENTIFICACIÓN FISCAL]",
  address: "[DIRECCIÓN POSTAL]",
  country: "[PAÍS]",
  email: "[EMAIL DE CONTACTO]",
  /** Autoridad de protección de datos del país, ante la que reclamar. */
  dataAuthority: "[AUTORIDAD DE PROTECCIÓN DE DATOS]",
  /** Dónde se aloja la aplicación, p. ej. «Vercel Inc. (Estados Unidos)». */
  hosting: "[PROVEEDOR DE ALOJAMIENTO]",
  /** Región del proyecto de Supabase, p. ej. «Estados Unidos (us-east-1)». */
  dataRegion: "[REGIÓN DE SUPABASE]",
} as const;

/** Fecha de la última revisión de los textos. */
export const LEGAL_LAST_UPDATED = "21 de septiembre de 2026";

/** Los datos que siguen sin rellenar. Vacío cuando se puede publicar. */
export function pendingOwnerFields(): string[] {
  return Object.values(SITE_OWNER).filter((value) => /^\[.*\]$/.test(value));
}
