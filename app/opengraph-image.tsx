import { ImageResponse } from "next/og";

import { fourPath } from "@/components/landing/example-poster";
import { readSiteUrl } from "@/infrastructure/site-url";
import { posterLayout, posterSideForSheets } from "@/modules/posters/poster";
import { DEFAULT_PRINT_CONFIGURATION } from "@/modules/printing/print-layout";
import { SHARE_IMAGE } from "@/presentation/next/public-pages";

/**
 * The picture a shared link shows on WhatsApp, Facebook or X (docs/seo.md §5).
 *
 * Generated at build time, so it always matches the product. The same
 * example as the landing: a "4" over its real sheet grid, 3 x 3 A4.
 */
export const alt = SHARE_IMAGE.alt;
export const size = { width: SHARE_IMAGE.width, height: SHARE_IMAGE.height };
export const contentType = "image/png";

/**
 * ImageResponse cannot read CSS variables: these mirror the theme tokens in
 * app/globals.css (--background, --foreground, --muted-foreground,
 * --illustration-1 and -2).
 */
const COLORS = {
  background: "#fbf9f3",
  foreground: "#1c1917",
  muted: "#78716c",
  paper: "#f2e4c4",
  figure: "#c6362e",
  grid: "#1c1917",
};

export default async function Image() {
  const print = DEFAULT_PRINT_CONFIGURATION;
  const poster = {
    width: posterSideForSheets(3, "width", print),
    height: posterSideForSheets(3, "height", print),
  };
  const layout = posterLayout(poster, print);
  const scale = 500 / poster.height;
  const host = new URL(readSiteUrl()).host;
  const fonts = await loadFonts();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "space-between",
        gap: 64,
        padding: "64px 80px",
        background: COLORS.background,
        color: COLORS.foreground,
        fontFamily: fonts ? "Manrope" : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignSelf: "stretch",
          flex: 1,
        }}
      >
        <div style={{ display: "flex", fontSize: 30, color: COLORS.muted }}>
          Piñata Maker
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontFamily: fonts ? "Playfair Display" : undefined,
              fontSize: 76,
              lineHeight: 1.08,
              fontWeight: 700,
            }}
          >
            Tu piñata a tamaño real, en hojas que imprimes en casa
          </div>
          <div style={{ fontSize: 30, color: COLORS.muted, lineHeight: 1.35 }}>
            Sube una imagen, elige cuánto mide y descarga el PDF. Gratis y sin
            registrarte.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 28 }}>{host}</div>
      </div>

      <svg
        style={{ alignSelf: "center" }}
        width={poster.width * scale}
        height={poster.height * scale}
        viewBox={`0 0 ${poster.width} ${poster.height}`}
      >
        <rect width={poster.width} height={poster.height} fill={COLORS.paper} />
        <path
          d={fourPath(poster.width, poster.height)}
          fill={COLORS.figure}
          fillRule="evenodd"
        />
        {layout.pages.map((page) => (
          <rect
            key={page.id}
            x={page.globalBounds.minX}
            y={page.globalBounds.minY}
            width={page.globalBounds.maxX - page.globalBounds.minX}
            height={page.globalBounds.maxY - page.globalBounds.minY}
            fill="none"
            stroke={COLORS.grid}
            strokeWidth={2 / scale}
          />
        ))}
      </svg>
    </div>,
    { ...size, fonts: fonts ?? undefined },
  );
}

/**
 * The site's own fonts, as TTF (ImageResponse does not read WOFF2). If the
 * CDN fails at build time the image still renders with the default font:
 * a plainer picture beats a failed deploy.
 */
async function loadFonts() {
  const source = "https://cdn.jsdelivr.net/fontsource/fonts";

  try {
    const [playfair, manrope] = await Promise.all(
      [
        `${source}/playfair-display@latest/latin-700-normal.ttf`,
        `${source}/manrope@latest/latin-500-normal.ttf`,
      ].map(async (url) => {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`${url} answered ${response.status}`);
        }

        return response.arrayBuffer();
      }),
    );

    return [
      { name: "Playfair Display", data: playfair, weight: 700 as const },
      { name: "Manrope", data: manrope, weight: 500 as const },
    ];
  } catch (error) {
    console.warn("Share image falls back to the default font", error);

    return null;
  }
}
