import type { Metadata } from "next";
import Link from "next/link";

import { ExamplePoster } from "@/components/landing/example-poster";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { readUsageLimits } from "@/modules/usage/usage";
import { publicPageMetadata } from "@/presentation/next/public-pages";

export const metadata: Metadata = publicPageMetadata({
  title: "Piñata Maker · Tu imagen a tamaño piñata, en hojas para imprimir",
  description:
    "Sube una imagen, elige cuánto mide en centímetros y descarga un PDF con la imagen ampliada a tamaño real, repartida en hojas A4, A3 o Carta con mapa de montaje. Gratis y sin registrarte.",
  path: "/",
});

const STEPS = [
  {
    title: "Sube tu imagen",
    text: "PNG, JPEG o WEBP. Vale una foto del móvil: sale derecha aunque la hayas hecho en vertical.",
  },
  {
    title: "Recórtala y elige cuánto mide",
    text: "En centímetros, como piensas la piñata. Ves al momento cuántas hojas salen y cómo se reparte la imagen.",
  },
  {
    title: "Imprime al 100 %",
    text: "En A4, A3 o Carta, en cualquier impresora. La regla de 10 cm de la primera hoja te confirma que no se escaló.",
  },
  {
    title: "Une, pega y recorta",
    text: "Cada hoja lleva su etiqueta y el mapa dice dónde va. Solapa las hojas por las cruces, pégalas sobre cartón y recorta la figura.",
  },
] as const;

const REASONS = [
  {
    title: "Medidas en centímetros, no en hojas",
    text: "Dices cuánto quieres que mida la figura y el alto sale solo, sin deformarla.",
  },
  {
    title: "Hojas justas",
    text: "Te propone las medidas que llenan hojas enteras, para no imprimir una columna casi en blanco.",
  },
  {
    title: "Mapa de montaje",
    text: "La primera hoja es la imagen con la retícula y la etiqueta de cada hoja: A1, A2, B1…",
  },
  {
    title: "Marcas de alineación",
    text: "Cada hoja repite un centímetro de la vecina con cruces encima: se pegan a ojo, sin recortar bordes.",
  },
  {
    title: "Regla de calibración",
    text: "Mide la regla antes de imprimir las demás. Si no da 10 cm, la impresora está escalando.",
  },
  {
    title: "Aviso de resolución",
    text: "Te avisa si la imagen se va a ver pixelada a ese tamaño y te dice hasta dónde sale nítida.",
  },
] as const;

const QUESTIONS = [
  {
    question: "¿Qué papel necesito?",
    answer:
      "Papel normal de impresora en A4, A3 o Carta. El PDF ya viene repartido para el tamaño que elijas; no necesitas un plotter ni una imprenta.",
  },
  {
    question: "¿Por qué hay que imprimir al 100 %?",
    answer:
      "Muchos programas encogen el documento para que quepa con márgenes («ajustar a página»). Entonces las hojas no encajan y la figura no mide lo que pediste. La regla de 10 cm de la primera hoja sirve para comprobarlo antes de imprimir el resto.",
  },
  {
    question: "¿Cómo se unen las hojas?",
    answer:
      "Cada hoja repite una franja de un centímetro de la de al lado, con cruces encima. Superpón la franja hasta que las cruces coincidan y pega. El mapa de la primera hoja te dice qué hoja va con cuál.",
  },
  {
    question: "¿Qué resolución necesita mi imagen?",
    answer:
      "Cuanta más, mejor. Una piñata se mira desde uno o dos metros: con unos 45 pixels por pulgada ya se ve bien a esa distancia. La herramienta te lo calcula y te avisa si te pasas de tamaño.",
  },
  {
    question: "¿Qué pasa con mi imagen?",
    answer:
      "Si no tienes cuenta, tu imagen solo viaja al servidor para generar el PDF y no se guarda. Con cuenta, se guarda en tu proyecto para que puedas volver a descargarla.",
  },
  {
    question: "¿Cuánto cuesta?",
    answer:
      "Es gratis. Sin cuenta tienes un número de PDF al día; con una cuenta gratuita tienes más y guardas tus proyectos.",
  },
] as const;

/**
 * La página de entrada: qué hace, cómo, con ejemplos y por qué aquí.
 *
 * Servida desde el servidor, con contenido propio: es lo que indexan los
 * buscadores y lo que AdSense exige para aprobar el sitio (docs/PRD.md §40 y
 * §42). La herramienta está siempre a un clic y sin cuenta (§38).
 */
export default function Page() {
  const limits = readUsageLimits(process.env);

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl space-y-24 px-6 pt-10 pb-24">
        <section className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            <h1 className="font-serif text-4xl leading-tight md:text-5xl">
              Tu piñata a tamaño real, en hojas que imprimes en casa
            </h1>
            <p className="text-muted-foreground text-lg">
              Sube una imagen, elige cuánto mide en centímetros y descarga un
              PDF con la imagen ampliada y repartida en hojas, con su mapa de
              montaje. Pégala sobre cartón, recorta la figura y a construir.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/crear">Crear mi póster gratis</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <a href="#como-funciona">Cómo funciona</a>
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">
              Sin registrarte: {limits.ANONYMOUS} PDF al día. Con una cuenta
              gratis, {limits.REGISTERED}.
            </p>
          </div>

          <ExamplePoster
            title="Número 4 para un cumpleaños"
            figure="four"
            sheetsWide={3}
            sheetsHigh={3}
            format="A4"
          />
        </section>

        <section id="como-funciona" className="space-y-10">
          <h2 className="font-serif text-3xl">Cómo funciona</h2>
          <ol className="grid gap-6 md:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="space-y-3">
                <span className="border-border bg-card flex size-9 items-center justify-center rounded-full border font-mono text-sm">
                  {index + 1}
                </span>
                <h3 className="font-medium">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-10">
          <div className="space-y-3">
            <h2 className="font-serif text-3xl">Ejemplos</h2>
            <p className="text-muted-foreground">
              Medidas y hojas calculadas con la misma herramienta que genera el
              PDF: es lo que te saldría a ti.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <ExamplePoster
              title="Número para una fiesta"
              figure="four"
              sheetsWide={2}
              sheetsHigh={2}
              format="A4"
            />
            <ExamplePoster
              title="Estrella de cinco picos"
              figure="star"
              sheetsWide={3}
              sheetsHigh={2}
              format="A4"
            />
            <ExamplePoster
              title="Corazón en papel Carta"
              figure="heart"
              sheetsWide={3}
              sheetsHigh={2}
              format="LETTER"
            />
          </div>
        </section>

        <section className="space-y-10">
          <div className="space-y-3">
            <h2 className="font-serif text-3xl">Por qué aquí</h2>
            <p className="text-muted-foreground">
              Hay muchas formas de imprimir una imagen en varias hojas. Esta
              está pensada para quien fabrica piñatas.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
            {REASONS.map((reason) => (
              <div key={reason.title} className="space-y-2">
                <h3 className="font-medium">{reason.title}</h3>
                <p className="text-muted-foreground text-sm">{reason.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <h2 className="font-serif text-3xl">Preguntas frecuentes</h2>
          <div className="divide-border border-border divide-y rounded-lg border">
            {QUESTIONS.map((item) => (
              <details key={item.question} className="group p-5">
                <summary className="cursor-pointer font-medium">
                  {item.question}
                </summary>
                <p className="text-muted-foreground mt-3 text-sm">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="border-border bg-card space-y-5 rounded-lg border p-8 text-center">
          <h2 className="font-serif text-3xl">¿Tienes ya la imagen?</h2>
          <p className="text-muted-foreground">
            En un par de minutos tienes el PDF listo para imprimir.
          </p>
          <Button asChild size="lg">
            <Link href="/crear">Crear mi póster gratis</Link>
          </Button>
        </section>
      </main>

      {/*
        Datos estructurados de las preguntas frecuentes (docs/PRD.md §42): el
        mismo texto que se ve, nada que el visitante no pueda leer.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: QUESTIONS.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          }),
        }}
      />
    </>
  );
}
