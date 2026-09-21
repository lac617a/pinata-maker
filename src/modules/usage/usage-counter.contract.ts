import { describe, expect, it } from "vitest";

import type { UsageCounter } from "./usage-counter";

/**
 * Qué significa cumplir el contrato del contador de uso.
 *
 * Se ejecuta contra cada implementación. Ver docs/AGENTS.md §27.
 * `subject` da claves nuevas en cada prueba: la base de datos real no se
 * vacía entre ejecuciones.
 */
export function describeUsageCounter(
  implementation: string,
  setup: () => Promise<{
    readonly counter: UsageCounter;
    readonly subject: (name: string) => string;
    readonly day: string;
  }>,
): void {
  describe(`${implementation} usage counter`, () => {
    it("should start at zero", async () => {
      const { counter, subject, day } = await setup();

      expect(await counter.used([subject("a")], day)).toBe(0);
    });

    it("should count until the limit and then refuse", async () => {
      const { counter, subject, day } = await setup();
      const who = [subject("b")];

      expect(await counter.consume(who, day, 2)).toEqual({
        allowed: true,
        used: 1,
      });
      expect(await counter.consume(who, day, 2)).toEqual({
        allowed: true,
        used: 2,
      });
      expect(await counter.consume(who, day, 2)).toEqual({
        allowed: false,
        used: 2,
      });
      expect(await counter.used(who, day)).toBe(2);
    });

    it("should count several keys as one person, by the highest", async () => {
      const { counter, subject, day } = await setup();
      const cookie = subject("cookie");
      const ip = subject("ip");

      // La misma IP ya gastó dos con otra cookie: borrar la cookie no da
      // el cupo de nuevo.
      await counter.consume([subject("old-cookie"), ip], day, 3);
      await counter.consume([subject("old-cookie"), ip], day, 3);

      expect(await counter.used([cookie, ip], day)).toBe(2);
      expect(await counter.consume([cookie, ip], day, 3)).toEqual({
        allowed: true,
        used: 3,
      });
      expect((await counter.consume([cookie, ip], day, 3)).allowed).toBe(false);
    });

    it("should let only one of two simultaneous requests take the last one", async () => {
      const { counter, subject, day } = await setup();
      const who = [subject("race")];

      const results = await Promise.all([
        counter.consume(who, day, 1),
        counter.consume(who, day, 1),
      ]);

      expect(results.filter((result) => result.allowed)).toHaveLength(1);
    });
  });
}
