import type { Prisma, PrismaClient } from "@sanarys/db";
import type { AnalyticsEventRepository, TrackedEvent } from "../domain/ports.js";

/** Seul fichier du module analytics qui connaisse Prisma (guide, section 10.1). */
export class PrismaAnalyticsEventRepository implements AnalyticsEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async record(event: TrackedEvent): Promise<void> {
    await this.prisma.analyticsEvent.create({
      data: {
        name: event.name,
        properties: event.properties as Prisma.InputJsonValue,
        sessionRef: event.sessionRef,
      },
    });
  }
}
