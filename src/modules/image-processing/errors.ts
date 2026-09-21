/**
 * Errores del procesamiento de imagen.
 *
 * Cada uno describe un resultado clasificable del proceso, no un fallo
 * genérico: la interfaz necesita distinguirlos para explicarle al usuario qué
 * pasó con su imagen. Ver docs/image-processing.md §77 y docs/PRD.md §9.
 */

export class InvalidContourError extends Error {
  readonly code = "INVALID_CONTOUR";

  constructor(message: string) {
    super(message);
    this.name = "InvalidContourError";
  }
}

/** El archivo no es uno de los formatos que el sistema sabe leer. */
export class UnsupportedImageFormatError extends Error {
  readonly code = "UNSUPPORTED_IMAGE_FORMAT";

  constructor(message: string) {
    super(message);
    this.name = "UnsupportedImageFormatError";
  }
}

/** El archivo pesa más de lo que el sistema acepta procesar. */
export class ImageFileTooLargeError extends Error {
  readonly code = "IMAGE_FILE_TOO_LARGE";

  constructor(message: string) {
    super(message);
    this.name = "ImageFileTooLargeError";
  }
}

/**
 * La imagen no tiene un tamaño utilizable.
 *
 * Cubre tanto la imagen demasiado pequeña para dar un contorno con detalle
 * como la demasiado grande para procesarse sin agotar memoria.
 */
export class InvalidImageDimensionsError extends Error {
  readonly code = "INVALID_IMAGE_DIMENSIONS";

  constructor(message: string) {
    super(message);
    this.name = "InvalidImageDimensionsError";
  }
}

/**
 * La máscara no contiene ninguna figura.
 *
 * Es el caso de la imagen completamente transparente y el de la segmentación
 * que no encontró nada. Ver docs/PRD.md §9.
 */
export class EmptyMaskError extends Error {
  readonly code = "EMPTY_MASK";

  constructor(message: string) {
    super(message);
    this.name = "EmptyMaskError";
  }
}

/**
 * La máscara no describe una sola figura de forma inequívoca.
 *
 * Unir regiones separadas en silencio produciría una plantilla que no
 * corresponde a lo que el usuario subió. Ver docs/image-processing.md §27.
 */
export class AmbiguousSubjectError extends Error {
  readonly code = "AMBIGUOUS_SUBJECT";

  constructor(message: string) {
    super(message);
    this.name = "AmbiguousSubjectError";
  }
}

/**
 * La foto trae la rotación de la cámara y todavía no se aplica.
 *
 * El navegador la endereza al enseñarla; el PDF, que incrusta los bytes tal
 * cual, no. Aceptarla daría una vista previa derecha y un documento girado.
 * Es mejor decirlo al subir que descubrirlo con las hojas ya impresas.
 * Ver docs/image-processing.md §9 y §110.
 */
export class UnsupportedImageOrientationError extends Error {
  readonly code = "UNSUPPORTED_IMAGE_ORIENTATION";

  constructor(message: string) {
    super(message);
    this.name = "UnsupportedImageOrientationError";
  }
}
