import type { Dimensions } from "@/modules/geometry/dimensions";
import type { Millimeters } from "@/modules/geometry/units";
import { traceMaskOutline } from "@/modules/image-processing/contour-extraction";
import {
  convertContourToPhysicalGeometry,
  DEFAULT_SIMPLIFICATION_TOLERANCE_MM,
} from "@/modules/image-processing/contour-to-geometry";
import {
  type AlphaMask,
  thresholdAlphaMask,
} from "@/modules/image-processing/mask";
import {
  isolateComponent,
  labelForegroundComponents,
  selectMainSubject,
} from "@/modules/image-processing/mask-components";
import { calculatePrintableArea } from "@/modules/printing/margins";
import { paperSize } from "@/modules/printing/paper-format";
import {
  DEFAULT_PRINT_CONFIGURATION,
  type PaperConfiguration,
} from "@/modules/printing/print-layout";
import {
  DEFAULT_EXTRUSION_CONFIGURATION,
  deriveTemplateFromSilhouette,
  type ExtrusionConfiguration,
  sideSegmentLengthFor,
} from "@/modules/templates/perimeter-extrusion";
import {
  type Template,
  type TemplateFootprint,
  templateFootprint,
} from "@/modules/templates/template";

/**
 * Condición que el usuario debe conocer aunque la plantilla sea válida.
 *
 * No son errores: la plantilla se genera igual. Son cosas que el dominio ya
 * sabía y que nadie estaba leyendo. Ver docs/PRD.md §22 y §23.
 */
export type TemplateWarning =
  | { readonly code: "OTHER_FIGURES_DISCARDED"; readonly count: number }
  | { readonly code: "EXACT_SIZE_NEEDS_DISTORTION" }
  | {
      readonly code: "DETAIL_LIMITED_BY_RESOLUTION";
      readonly appliedTolerance: Millimeters;
    };

export type GenerateTemplateInput = {
  /** Lo que entrega la eliminación de fondo, venga de donde venga. */
  readonly mask: AlphaMask;
  /** Tamaño físico que el usuario pide para la figura. */
  readonly dimensions: Dimensions;
  readonly depth: Millimeters;
  readonly name?: string;
  readonly alphaThreshold?: number;
  readonly simplificationTolerance?: Millimeters;
  /**
   * Papel con el que se va a imprimir.
   *
   * No entra en la plantilla: sirve para que las piezas laterales no salgan
   * más anchas que una hoja. Ver `sideSegmentLengthFor`.
   */
  readonly paper?: PaperConfiguration;
  readonly extrusion?: Partial<ExtrusionConfiguration>;
};

export type GenerateTemplateResult = {
  readonly template: Template;
  readonly footprint: TemplateFootprint;
  readonly warnings: readonly TemplateWarning[];
};

/**
 * Convierte una máscara en una plantilla recortable.
 *
 * Coordina procesamiento de imagen, geometría y plantillas sin decidir nada
 * por su cuenta: cada regla física vive en su módulo. Ver
 * docs/architecture.md §6.
 *
 * Lo único que aporta es lo que ningún módulo puede saber solo: con qué papel
 * se va a imprimir, y por tanto cuánto puede medir una pieza lateral.
 */
export function generateTemplate(
  input: GenerateTemplateInput,
): GenerateTemplateResult {
  const binary = thresholdAlphaMask(input.mask, input.alphaThreshold);
  const labeling = labelForegroundComponents(binary);
  const subject = selectMainSubject(labeling);

  const outline = traceMaskOutline(
    isolateComponent(binary, labeling, subject.component),
  );

  const requestedTolerance =
    input.simplificationTolerance ?? DEFAULT_SIMPLIFICATION_TOLERANCE_MM;

  const physical = convertContourToPhysicalGeometry({
    contour: outline.outer,
    holes: outline.holes,
    targetDimensions: input.dimensions,
    simplificationTolerance: requestedTolerance,
  });

  const template = deriveTemplateFromSilhouette({
    silhouette: physical.polygon,
    holes: physical.holes,
    depth: input.depth,
    name: input.name,
    configuration: {
      maxSideSegmentLength: maximumSideLength(input),
      ...input.extrusion,
    },
  });

  return {
    template,
    footprint: templateFootprint(template),
    warnings: collectWarnings({
      discarded: subject.discarded.length,
      requiresDistortion: physical.requiresDistortionForExactFit,
      requestedTolerance,
      appliedTolerance: physical.appliedSimplificationTolerance,
    }),
  };
}

/**
 * Cuánto puede medir el cuerpo de una pieza lateral con este papel.
 *
 * Una pieza más ancha que el área imprimible se parte en dos hojas y
 * desperdicia la segunda. Ver docs/template.md §118.
 */
function maximumSideLength(input: GenerateTemplateInput): Millimeters {
  const paper = input.paper ?? DEFAULT_PRINT_CONFIGURATION.paper;

  const printable = calculatePrintableArea(
    paperSize(paper.format, paper.orientation),
    paper.margins,
  );

  return sideSegmentLengthFor(
    printable.width,
    input.extrusion?.tabWidth ?? DEFAULT_EXTRUSION_CONFIGURATION.tabWidth,
  );
}

function collectWarnings(state: {
  discarded: number;
  requiresDistortion: boolean;
  requestedTolerance: Millimeters;
  appliedTolerance: Millimeters;
}): TemplateWarning[] {
  const warnings: TemplateWarning[] = [];

  if (state.discarded > 0) {
    warnings.push({
      code: "OTHER_FIGURES_DISCARDED",
      count: state.discarded,
    });
  }

  if (state.requiresDistortion) {
    warnings.push({ code: "EXACT_SIZE_NEEDS_DISTORTION" });
  }

  if (state.appliedTolerance > state.requestedTolerance) {
    warnings.push({
      code: "DETAIL_LIMITED_BY_RESOLUTION",
      appliedTolerance: state.appliedTolerance,
    });
  }

  return warnings;
}
