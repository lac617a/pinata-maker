import { createDimensions, type Dimensions } from "./dimensions";
import { InvalidScaleError } from "./errors";
import { millimetersEqual } from "./units";

/**
 * Relación adimensional entre una geometría de origen y su resultado.
 *
 * `scale = 2` significa que la geometría resultante mide el doble en ambos
 * ejes. No es un factor de zoom de pantalla ni una resolución.
 * Ver docs/domain.md §45.
 */
export type Scale = number;

/**
 * Resultado de ajustar una geometría a unas dimensiones objetivo conservando
 * la proporción.
 *
 * `requiresDistortionForExactFit` permite que la UI avise al usuario cuando
 * alcanzar exactamente ambas dimensiones exigiría deformar la figura. El
 * dominio nunca deforma en silencio. Ver docs/geometry.md §27.
 */
export type ProportionalFit = {
  readonly scale: Scale;
  readonly dimensions: Dimensions;
  readonly requiresDistortionForExactFit: boolean;
};

export function scaleDimensions(
  dimensions: Dimensions,
  scale: Scale,
): Dimensions {
  assertValidScale(scale);

  return createDimensions(dimensions.width * scale, dimensions.height * scale);
}

/**
 * Calcula el escalado uniforme que contiene la geometría dentro del objetivo.
 *
 * Se usa el menor de los dos factores para que el resultado quepa completo;
 * usar factores distintos por eje deformaría la figura, lo cual está prohibido
 * por defecto. Ver docs/geometry.md §25 y §26.
 */
export function fitToDimensions(
  source: Dimensions,
  target: Dimensions,
): ProportionalFit {
  const scaleX = target.width / source.width;
  const scaleY = target.height / source.height;
  const scale = Math.min(scaleX, scaleY);

  const dimensions = scaleDimensions(source, scale);

  return {
    scale,
    dimensions,
    requiresDistortionForExactFit:
      !millimetersEqual(dimensions.width, target.width) ||
      !millimetersEqual(dimensions.height, target.height),
  };
}

export function assertValidScale(scale: Scale): asserts scale is Scale {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new InvalidScaleError(
      `Scale must be a finite value greater than 0, received ${scale}.`,
    );
  }
}
