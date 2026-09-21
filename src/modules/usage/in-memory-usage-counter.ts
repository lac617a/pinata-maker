import type { UsageCounter } from "./usage-counter";

/** Contador en memoria, para las pruebas. Cumple el mismo contrato. */
export class InMemoryUsageCounter implements UsageCounter {
  private readonly counts = new Map<string, number>();

  async used(subjects: readonly string[], day: string): Promise<number> {
    return this.current(subjects, day);
  }

  async consume(
    subjects: readonly string[],
    day: string,
    limit: number,
  ): Promise<{ allowed: boolean; used: number }> {
    // Sin `await` entre leer y sumar: es lo que la hace atómica aquí.
    const used = this.current(subjects, day);

    if (used >= limit) {
      return { allowed: false, used };
    }

    for (const subject of subjects) {
      this.counts.set(
        key(subject, day),
        (this.counts.get(key(subject, day)) ?? 0) + 1,
      );
    }

    return { allowed: true, used: used + 1 };
  }

  private current(subjects: readonly string[], day: string): number {
    return Math.max(
      0,
      ...subjects.map((subject) => this.counts.get(key(subject, day)) ?? 0),
    );
  }
}

function key(subject: string, day: string): string {
  return `${day}|${subject}`;
}
