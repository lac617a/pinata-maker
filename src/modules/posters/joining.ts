import type { Millimeters } from "@/modules/geometry/units";
import type {
  PaperFormat,
  PaperOrientation,
} from "@/modules/printing/paper-format";
import {
  DEFAULT_PRINT_CONFIGURATION,
  type PrintConfiguration,
} from "@/modules/printing/print-layout";

/**
 * How the sheets are put together (docs/pdf.md §99).
 *
 * `OVERLAP`: each sheet repeats a 1 cm strip of its neighbour; lay one over
 * the other until the crosses meet. Easy by eye, and the default.
 * `TRIM`: no repeated strip, like Block Posters; trim the white margin along
 * the corner marks and butt the sheets edge to edge. Fewer sheets for the
 * same size, more careful cutting.
 */
export type PosterJoining = "OVERLAP" | "TRIM";

export const POSTER_JOININGS: readonly PosterJoining[] = ["OVERLAP", "TRIM"];

const OVERLAP_BY_JOINING: Readonly<Record<PosterJoining, Millimeters>> = {
  OVERLAP: DEFAULT_PRINT_CONFIGURATION.overlap,
  TRIM: 0,
};

/** The print configuration for a paper and a way of joining the sheets. */
export function posterPrintConfiguration(
  paper: {
    readonly format: PaperFormat;
    readonly orientation: PaperOrientation;
  },
  joining: PosterJoining,
): PrintConfiguration {
  return {
    ...DEFAULT_PRINT_CONFIGURATION,
    paper: { ...DEFAULT_PRINT_CONFIGURATION.paper, ...paper },
    overlap: OVERLAP_BY_JOINING[joining],
  };
}

/** Read back from a configuration: no overlap means trimming. */
export function joiningOf(print: PrintConfiguration): PosterJoining {
  return print.overlap > 0 ? "OVERLAP" : "TRIM";
}

export function isPosterJoining(value: unknown): value is PosterJoining {
  return POSTER_JOININGS.includes(value as PosterJoining);
}
