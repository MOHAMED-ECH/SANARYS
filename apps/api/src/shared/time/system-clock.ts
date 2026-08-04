/**
 * Horloge injectable.
 *
 * Le guide (section 6.4) demande des fonctions deterministes : un cas d'usage
 * qui appelle `new Date()` directement n'est pas testable sans manipuler le
 * temps global. On injecte donc une horloge.
 */
export interface ClockPort {
  now(): Date;
}

export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}

/** Horloge figee, utilisee par les tests. */
export class FixedClock implements ClockPort {
  constructor(private readonly instant: Date) {}

  now(): Date {
    return this.instant;
  }
}
