import { InvalidAssemblyError } from "./errors";
import { type Template, templatePiecesWithRole } from "./template";

/** Ver docs/assembly.md §10. */
export type ConnectionType = "TAB" | "EDGE" | "FOLD";

/**
 * Relación física entre dos piezas.
 *
 * La dirección sale siempre de la pieza que posee la pestaña, porque es la
 * que se pliega y se pega sobre la otra. Ver docs/assembly.md §11 y §14.
 */
export type AssemblyConnection = {
  readonly id: string;
  readonly fromPiece: string;
  readonly toPiece: string;
  readonly type: ConnectionType;
};

/** Ver docs/assembly.md §28. */
export type AssemblyActionType =
  "IDENTIFY" | "FOLD" | "ATTACH" | "ALIGN" | "CLOSE";

export type AssemblyAction = {
  readonly type: AssemblyActionType;
  readonly pieces: readonly string[];
};

export type AssemblyStep = {
  readonly order: number;
  readonly actions: readonly AssemblyAction[];
};

export type Assembly = {
  readonly connections: readonly AssemblyConnection[];
  readonly steps: readonly AssemblyStep[];
};

/**
 * Deriva cómo se monta una plantilla de extrusión perimetral.
 *
 * Cada pieza lateral se pega a las dos caras y a sus dos vecinas, y el
 * conjunto de laterales forma un anillo cerrado.
 * Ver docs/assembly.md §99-§103.
 */
export function deriveAssembly(template: Template): Assembly {
  const sides = templatePiecesWithRole(template, "SIDE");

  if (sides.length === 0) {
    throw new InvalidAssemblyError(
      "A template without side pieces has no volume to assemble.",
    );
  }

  const connections: AssemblyConnection[] = sides.flatMap((side, index) => {
    // El anillo se cierra: la última pieza se une a la primera. Con una sola
    // pieza lateral, sus dos extremos se unen entre sí.
    const next = sides[(index + 1) % sides.length];

    return [
      connection(side.id, "FRONT"),
      connection(side.id, "BACK"),
      connection(side.id, next.id),
    ];
  });

  return { connections, steps: assemblySteps(sides.map((side) => side.id)) };
}

function connection(fromPiece: string, toPiece: string): AssemblyConnection {
  return {
    id: `${fromPiece}->${toPiece}`,
    fromPiece,
    toPiece,
    type: "TAB",
  };
}

/**
 * Orden de montaje.
 *
 * El anillo se monta antes de pegarlo a ninguna cara, porque una tira suelta
 * se manipula y una ya pegada no. `BACK` va antes que `FRONT` para que los
 * desajustes acumulados queden en la cara trasera.
 *
 * El último paso es `CLOSE` y no `ATTACH`: una piñata que se cierra del todo
 * no puede rellenarse, así que el paso anterior deja un tramo sin pegar.
 * Ver docs/assembly.md §102 y §103.
 */
function assemblySteps(sideIds: readonly string[]): AssemblyStep[] {
  const everything = ["FRONT", "BACK", ...sideIds];

  return [
    { order: 1, actions: [{ type: "IDENTIFY", pieces: everything }] },
    { order: 2, actions: [{ type: "FOLD", pieces: [...sideIds] }] },
    { order: 3, actions: [{ type: "ATTACH", pieces: [...sideIds] }] },
    { order: 4, actions: [{ type: "ATTACH", pieces: [...sideIds, "BACK"] }] },
    { order: 5, actions: [{ type: "ALIGN", pieces: [...sideIds, "BACK"] }] },
    { order: 6, actions: [{ type: "ATTACH", pieces: [...sideIds, "FRONT"] }] },
    { order: 7, actions: [{ type: "CLOSE", pieces: [...sideIds, "FRONT"] }] },
  ];
}

/**
 * Comprueba que las piezas forman una piñata montable.
 *
 * Ver docs/assembly.md §105.
 */
export function validateAssembly(template: Template, assembly: Assembly): void {
  const sides = templatePiecesWithRole(template, "SIDE").map((side) => side.id);
  const connected = new Set(
    assembly.connections.flatMap(({ fromPiece, toPiece }) => [
      fromPiece,
      toPiece,
    ]),
  );

  for (const piece of template.pieces) {
    if (!connected.has(piece.id)) {
      throw new InvalidAssemblyError(
        `Piece ${piece.id} is not connected to anything: the assembly would leave it out.`,
      );
    }
  }

  for (const side of sides) {
    for (const face of ["FRONT", "BACK"]) {
      if (!hasConnection(assembly, side, face)) {
        throw new InvalidAssemblyError(
          `Side piece ${side} is not attached to ${face}.`,
        );
      }
    }
  }

  assertRingIsClosed(assembly, sides);
}

/**
 * El anillo lateral debe cerrarse sobre sí mismo.
 *
 * El ciclo que forma es físico y legítimo, no el ciclo de dependencias que
 * `assembly.md` §22 y §83 prohíben: la figura es cerrada, así que la última
 * pieza vuelve a la primera. Un anillo abierto significa que falta una pieza
 * o que el perímetro no se repartió entero. Ver docs/assembly.md §101.
 */
function assertRingIsClosed(
  assembly: Assembly,
  sides: readonly string[],
): void {
  const next = new Map(
    assembly.connections
      .filter((link) => sides.includes(link.toPiece))
      .map((link) => [link.fromPiece, link.toPiece]),
  );

  let current = sides[0];

  for (let step = 0; step < sides.length; step++) {
    const following = next.get(current);

    if (!following) {
      throw new InvalidAssemblyError(
        `The side ring breaks at ${current}: it is not joined to another side piece.`,
      );
    }

    current = following;
  }

  if (current !== sides[0]) {
    throw new InvalidAssemblyError(
      `The side ring does not close: following it from ${sides[0]} ends at ${current}.`,
    );
  }
}

function hasConnection(
  assembly: Assembly,
  fromPiece: string,
  toPiece: string,
): boolean {
  return assembly.connections.some(
    (link) => link.fromPiece === fromPiece && link.toPiece === toPiece,
  );
}
