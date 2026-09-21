import { fourPath } from "@/components/landing/example-poster";

/**
 * Explanatory drawings for the guides.
 *
 * Plain SVG with the theme tokens, server-rendered: they weigh nothing and
 * follow the theme. They show what the real PDF prints — the crosses, the
 * 1 cm strip, the row letters — so the guide and the sheets agree.
 */

const TEXT = {
  fill: "var(--foreground)",
  fontFamily: "var(--font-sans)",
} as const;

const MUTED = {
  fill: "var(--muted-foreground)",
  fontFamily: "var(--font-sans)",
} as const;

/** The alignment cross printed near the edges of every sheet. */
function Cross({ x, y, size = 10 }: { x: number; y: number; size?: number }) {
  return (
    <g stroke="var(--foreground)" strokeWidth={1.6}>
      <line x1={x - size} y1={y} x2={x + size} y2={y} />
      <line x1={x} y1={y - size} x2={x} y2={y + size} />
    </g>
  );
}

/** Two neighbouring sheets overlapping by the repeated strip. */
export function SheetOverlapDiagram() {
  return (
    <svg
      viewBox="0 0 600 270"
      className="h-auto w-full"
      role="img"
      aria-label="Dos hojas vecinas solapadas por una franja de un centímetro, con las cruces una encima de otra"
    >
      {/* Left sheet: A1. */}
      <rect
        x={40}
        y={30}
        width={260}
        height={200}
        fill="var(--background)"
        stroke="var(--border)"
      />
      <rect
        x={40}
        y={30}
        width={260}
        height={200}
        fill="var(--illustration-1)"
        opacity={0.6}
      />
      <text x={60} y={220} fontSize={14} {...MUTED}>
        A1
      </text>

      {/* Right sheet: A2, laid on top, its left strip over A1's right strip. */}
      <rect
        x={260}
        y={30}
        width={260}
        height={200}
        fill="var(--background)"
        stroke="var(--foreground)"
        strokeWidth={1.5}
      />
      <rect
        x={260}
        y={30}
        width={260}
        height={200}
        fill="var(--illustration-1)"
        opacity={0.35}
      />
      <text x={490} y={220} fontSize={14} {...MUTED}>
        A2
      </text>

      {/* The shared strip. */}
      <rect
        x={260}
        y={30}
        width={40}
        height={200}
        fill="var(--illustration-2)"
        opacity={0.25}
      />
      <Cross x={280} y={80} />
      <Cross x={280} y={180} />

      <line
        x1={260}
        y1={250}
        x2={300}
        y2={250}
        stroke="var(--foreground)"
        strokeWidth={1.5}
      />
      <line x1={260} y1={244} x2={260} y2={256} stroke="var(--foreground)" />
      <line x1={300} y1={244} x2={300} y2={256} stroke="var(--foreground)" />
      <text x={310} y={255} fontSize={14} {...TEXT}>
        franja de 1 cm que repiten las dos hojas
      </text>
    </svg>
  );
}

/** The printed 10 cm line against a real ruler. */
export function RulerCheckDiagram() {
  const start = 60;
  const unit = 48;

  return (
    <svg
      viewBox="0 0 600 170"
      className="h-auto w-full"
      role="img"
      aria-label="La línea impresa de 100 mm, medida con una regla: tiene que ir del 0 al 10"
    >
      <text x={start} y={34} fontSize={14} {...MUTED}>
        En la primera hoja del PDF
      </text>
      <line
        x1={start}
        y1={56}
        x2={start + unit * 10}
        y2={56}
        stroke="var(--foreground)"
        strokeWidth={2}
      />
      <line x1={start} y1={48} x2={start} y2={64} stroke="var(--foreground)" />
      <line
        x1={start + unit * 10}
        y1={48}
        x2={start + unit * 10}
        y2={64}
        stroke="var(--foreground)"
      />
      <text
        x={start + unit * 5}
        y={80}
        fontSize={13}
        textAnchor="middle"
        {...TEXT}
      >
        100 mm
      </text>

      {/* The physical ruler. */}
      <rect
        x={start - 20}
        y={96}
        width={unit * 10 + 40}
        height={48}
        rx={4}
        fill="var(--illustration-4)"
        opacity={0.55}
        stroke="var(--foreground)"
      />
      {Array.from({ length: 11 }, (_unused, cm) => (
        <g key={cm}>
          <line
            x1={start + cm * unit}
            y1={96}
            x2={start + cm * unit}
            y2={116}
            stroke="var(--foreground)"
          />
          <text
            x={start + cm * unit}
            y={134}
            fontSize={12}
            textAnchor="middle"
            {...TEXT}
          >
            {cm}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Print at actual size, not fitted to the page. */
export function PrintScaleDiagram() {
  const panel = (x: number, ok: boolean) => (
    <g>
      <rect
        x={x}
        y={20}
        width={240}
        height={170}
        rx={8}
        fill="var(--card)"
        stroke="var(--border)"
      />
      {/* The sheet, and the printed content on it. */}
      <rect
        x={x + 30}
        y={40}
        width={100}
        height={130}
        fill="var(--background)"
        stroke="var(--foreground)"
      />
      <rect
        x={ok ? x + 34 : x + 44}
        y={ok ? 44 : 56}
        width={ok ? 92 : 72}
        height={ok ? 122 : 98}
        fill="var(--illustration-1)"
      />
      <text x={x + 142} y={70} fontSize={13} {...TEXT}>
        {ok ? "Tamaño real" : "Ajustar a"}
      </text>
      <text x={x + 142} y={89} fontSize={13} {...TEXT}>
        {ok ? "o al 100 %" : "página"}
      </text>
      <text
        x={x + 145}
        y={140}
        fontSize={34}
        fill={ok ? "var(--foreground)" : "var(--destructive)"}
        fontFamily="var(--font-sans)"
      >
        {ok ? "✓" : "✗"}
      </text>
    </g>
  );

  return (
    <svg
      viewBox="0 0 560 210"
      className="h-auto w-full"
      role="img"
      aria-label="Con tamaño real la imagen llena la hoja; con ajustar a página sale más pequeña y las hojas no encajan"
    >
      {panel(20, true)}
      {panel(300, false)}
    </svg>
  );
}

/** How the labels map to the wall: letter = row, number = column. */
export function SheetMapDiagram() {
  const rows = ["A", "B", "C"];
  const columns = [1, 2, 3];
  const width = 90;
  const height = 110;
  const left = 70;
  const top = 50;

  return (
    <svg
      viewBox="0 0 400 420"
      className="mx-auto h-auto w-full max-w-sm"
      role="img"
      aria-label="Mapa de nueve hojas: las letras A, B y C son las filas de arriba abajo; los números 1, 2 y 3 son las columnas de izquierda a derecha"
    >
      <text x={left} y={30} fontSize={14} {...MUTED}>
        columnas 1 → 3
      </text>
      <text
        x={30}
        y={top + 10}
        fontSize={14}
        transform={`rotate(90 30 ${top + 10})`}
        {...MUTED}
      >
        filas A → C
      </text>
      <rect
        x={left}
        y={top}
        width={width * 3}
        height={height * 3}
        fill="var(--illustration-1)"
        opacity={0.5}
      />
      {rows.map((row, r) =>
        columns.map((column, c) => (
          <g key={`${row}${column}`}>
            <rect
              x={left + c * width}
              y={top + r * height}
              width={width}
              height={height}
              fill="none"
              stroke="var(--foreground)"
              strokeWidth={1.5}
            />
            <text
              x={left + c * width + width / 2}
              y={top + r * height + height / 2 + 7}
              fontSize={22}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fill="var(--foreground)"
            >
              {row}
              {column}
            </text>
          </g>
        )),
      )}
      <text x={left} y={top + height * 3 + 32} fontSize={13} {...MUTED}>
        Une primero cada fila; después, las filas entre sí.
      </text>
    </svg>
  );
}

/** The parts of a box piñata: two faces and a side strip with tabs. */
export function PinataPartsDiagram() {
  const face = { width: 170, height: 210 };

  return (
    <svg
      viewBox="0 0 640 330"
      className="h-auto w-full"
      role="img"
      aria-label="Las partes de la piñata: el frente con la imagen, la espalda recortada en espejo y la tira lateral con pestañas en los dos bordes"
    >
      {/* Front: the printed poster glued on cardboard. */}
      <g transform="translate(20 40)">
        <path
          d={fourPath(face.width, face.height)}
          fill="var(--illustration-2)"
          fillRule="evenodd"
        />
        <text x={0} y={face.height + 34} fontSize={15} {...TEXT}>
          Frente
        </text>
        <text x={0} y={face.height + 54} fontSize={12} {...MUTED}>
          tu póster pegado en cartón
        </text>
      </g>

      {/* Back: the same outline, flipped. */}
      <g transform={`translate(${220 + face.width} 40) scale(-1 1)`}>
        <path
          d={fourPath(face.width, face.height)}
          fill="var(--card)"
          stroke="var(--foreground)"
          strokeDasharray="6 4"
          strokeWidth={1.5}
          fillRule="evenodd"
        />
      </g>
      <text x={220} y={face.height + 74} fontSize={15} {...TEXT}>
        Espalda
      </text>
      <text x={220} y={face.height + 94} fontSize={12} {...MUTED}>
        el mismo contorno, dado la vuelta
      </text>

      {/* Side strip with tabs on both edges. */}
      <g transform="translate(430 40)">
        <rect
          x={30}
          y={0}
          width={80}
          height={face.height}
          fill="var(--illustration-1)"
          stroke="var(--foreground)"
        />
        {Array.from({ length: 7 }, (_unused, i) => {
          const y = 8 + i * 29;
          return (
            <g key={i} fill="var(--card)" stroke="var(--foreground)">
              <path
                d={`M 30 ${y} L 14 ${y + 5} L 14 ${y + 17} L 30 ${y + 22} Z`}
              />
              <path
                d={`M 110 ${y} L 126 ${y + 5} L 126 ${y + 17} L 110 ${y + 22} Z`}
              />
            </g>
          );
        })}
        <text x={0} y={face.height + 34} fontSize={15} {...TEXT}>
          Tira lateral
        </text>
        <text x={0} y={face.height + 54} fontSize={12} {...MUTED}>
          su ancho es el grosor
        </text>
        <text x={0} y={face.height + 72} fontSize={12} {...MUTED}>
          pestañas a los dos lados
        </text>
      </g>
    </svg>
  );
}

/** Without overlap: trim the white margin along the corner marks and butt. */
export function TrimJoinDiagram() {
  const sheet = (x: number, label: string, trimRight: boolean) => (
    <g>
      <rect
        x={x}
        y={30}
        width={220}
        height={190}
        fill="var(--background)"
        stroke="var(--border)"
      />
      {/* The printed area, inside a white margin. */}
      <rect
        x={x + 14}
        y={44}
        width={192}
        height={162}
        fill="var(--illustration-1)"
      />
      {/* Corner marks in the margin, continuing the edges. */}
      {[
        [x + 14, 44],
        [x + 206, 44],
        [x + 14, 206],
        [x + 206, 206],
      ].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`} stroke="var(--foreground)" strokeWidth={1.4}>
          <line
            x1={cx}
            y1={cy < 100 ? 32 : 218}
            x2={cx}
            y2={cy < 100 ? 41 : 209}
          />
          <line
            x1={cx < x + 100 ? x + 2 : x + 218}
            y1={cy}
            x2={cx < x + 100 ? x + 11 : x + 209}
            y2={cy}
          />
        </g>
      ))}
      {trimRight ? (
        <line
          x1={x + 206}
          y1={24}
          x2={x + 206}
          y2={226}
          stroke="var(--destructive)"
          strokeWidth={1.6}
          strokeDasharray="6 4"
        />
      ) : null}
      <text x={x + 24} y={196} fontSize={14} {...MUTED}>
        {label}
      </text>
    </g>
  );

  return (
    <svg
      viewBox="0 0 560 270"
      className="h-auto w-full"
      role="img"
      aria-label="Dos hojas con margen blanco y marcas en las esquinas: se recorta el margen de una por la línea que marcan y se une borde con borde con la otra"
    >
      {sheet(40, "A1", true)}
      {sheet(300, "A2", false)}
      <text x={40} y={252} fontSize={14} {...TEXT}>
        Corta por la línea que marcan las esquinas y junta los bordes.
      </text>
    </svg>
  );
}
