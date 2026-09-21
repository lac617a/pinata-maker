import { InvalidImageDimensionsError } from "./errors";
import { type AlphaMask, createAlphaMask } from "./mask";
import type { Pixels } from "./pixel-contour";

/**
 * Canal alfa de una imagen ya decodificada.
 *
 * Quien decodifica es de fuera —un canvas en el navegador, una librería en el
 * servidor— y entrega los cuatro canales por pixel. Aquí solo se saca el
 * cuarto, que es lo único que el dominio necesita.
 *
 * Esta función es la mitad del trabajo de la eliminación de fondo que se
 * puede hacer sin decidir nada: una imagen que **ya trae transparencia** no
 * necesita que nadie le quite el fondo. Lo que falta de la fase B es el caso
 * contrario, el de una foto opaca. Ver docs/roadmap.md §4.
 */
export function alphaMaskFromRgba(input: {
  readonly width: Pixels;
  readonly height: Pixels;
  /** Cuatro bytes por pixel —rojo, verde, azul, alfa—, por filas. */
  readonly rgba: Uint8Array | Uint8ClampedArray;
}): AlphaMask {
  const expected = input.width * input.height * 4;

  if (input.rgba.length !== expected) {
    throw new InvalidImageDimensionsError(
      `An image of ${input.width} × ${input.height} px needs ${expected} bytes in RGBA, received ${input.rgba.length}.`,
    );
  }

  const alpha = new Uint8Array(input.width * input.height);

  for (let pixel = 0; pixel < alpha.length; pixel++) {
    alpha[pixel] = input.rgba[pixel * 4 + 3];
  }

  return createAlphaMask(input.width, input.height, alpha);
}

/**
 * Si la imagen no tiene nada transparente.
 *
 * Importa porque el resultado sería correcto y a la vez inútil: sin fondo que
 * descartar, la silueta es el rectángulo entero de la imagen y la piñata
 * sale con forma de caja. Quien llama puede avisar antes de que el usuario
 * espere por un molde que no quiere.
 */
export function maskIsFullyOpaque(mask: AlphaMask): boolean {
  return mask.alpha.every((value) => value === 255);
}
