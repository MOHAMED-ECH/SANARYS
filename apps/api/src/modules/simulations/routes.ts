import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  CompleteSimulationResponseSchema,
  PatchSimulationRequestSchema,
  SimulationRecordSchema,
  StartSimulationResponseSchema,
} from "@sanarys/schemas";
import { errorResponses } from "../../lib/http.js";
import {
  SimulationService,
  SimulationIncompleteError,
  SimulationNotFoundError,
  NoActiveRuleSetError,
} from "./service.js";
import { renderSimulationPdf } from "./pdf.js";

const VALID_STEPS = [
  "zone",
  "companies",
  "activity",
  "schedule",
  "existingSetup",
  "expectations",
  "contact",
] as const;

export const simulationsRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = new SimulationService(app.prisma);

  app.post(
    "/simulations",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        tags: ["simulations"],
        summary: "Demarre une simulation CSPS et retourne un token de reprise",
        body: z.object({ industrialZoneId: z.string().optional() }).default({}),
        response: { 201: StartSimulationResponseSchema, ...errorResponses },
      },
    },
    async (request, reply) => {
      try {
        const result = await service.start(request.body.industrialZoneId);
        return reply.code(201).send(result);
      } catch (error) {
        if (error instanceof NoActiveRuleSetError) {
          return reply.code(503).send({ message: error.message, code: "NO_ACTIVE_RULESET" });
        }
        throw error;
      }
    },
  );

  app.patch(
    "/simulations/:id",
    {
      schema: {
        tags: ["simulations"],
        summary: "Sauvegarde incrementale d'une etape du wizard",
        params: z.object({ id: z.string() }),
        body: PatchSimulationRequestSchema,
        response: { 200: z.object({ ok: z.boolean() }), ...errorResponses },
      },
    },
    async (request, reply) => {
      const { step, data } = request.body;
      if (!VALID_STEPS.includes(step)) {
        return reply.code(400).send({ message: "Etape inconnue.", code: "UNKNOWN_STEP" });
      }
      try {
        await service.patchStep(request.params.id, step, data);
        return reply.send({ ok: true });
      } catch (error) {
        if (error instanceof SimulationNotFoundError) {
          return reply.code(404).send({ message: "Simulation introuvable." });
        }
        throw error;
      }
    },
  );

  app.get(
    "/simulations/:id",
    {
      schema: {
        tags: ["simulations"],
        summary: "Reprend une simulation via son token (sans compte)",
        params: z.object({ id: z.string() }),
        querystring: z.object({ resumeToken: z.string().min(10) }),
        response: { 200: SimulationRecordSchema, ...errorResponses },
      },
    },
    async (request, reply) => {
      try {
        const simulation = await service.resume(request.params.id, request.query.resumeToken);
        return reply.send({
          id: simulation.id,
          status: simulation.status,
          input: simulation.inputJson as never,
          result: (simulation.resultJson ?? null) as never,
          createdAt: simulation.createdAt.toISOString(),
          completedAt: simulation.completedAt?.toISOString() ?? null,
        });
      } catch (error) {
        if (error instanceof SimulationNotFoundError) {
          // Lien invalide ou expire : reponse identique pour ne rien divulguer.
          return reply.code(404).send({ message: "Lien de reprise invalide ou expire." });
        }
        throw error;
      }
    },
  );

  app.post(
    "/simulations/:id/complete",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        tags: ["simulations"],
        summary: "Execute le moteur de regles et fige le resultat (snapshot immuable)",
        params: z.object({ id: z.string() }),
        response: { 200: CompleteSimulationResponseSchema, ...errorResponses },
      },
    },
    async (request, reply) => {
      try {
        const { result } = await service.complete(request.params.id);
        return reply.send({
          id: request.params.id,
          result,
          pdfUrl: `/api/v1/simulations/${request.params.id}/pdf`,
        });
      } catch (error) {
        if (error instanceof SimulationNotFoundError) {
          return reply.code(404).send({ message: "Simulation introuvable." });
        }
        if (error instanceof SimulationIncompleteError) {
          return reply.code(422).send({ message: error.message, code: "SIMULATION_INCOMPLETE" });
        }
        throw error;
      }
    },
  );

  app.get(
    "/simulations/:id/pdf",
    {
      schema: {
        tags: ["simulations"],
        summary: "Recapitulatif PDF de la simulation (document non contractuel)",
        params: z.object({ id: z.string() }),
        produces: ["application/pdf"],
      },
    },
    async (request, reply) => {
      const simulation = await app.prisma.simulation.findUnique({
        where: { id: request.params.id },
      });

      if (!simulation || simulation.status !== "COMPLETED" || !simulation.resultJson) {
        return reply
          .code(404)
          .send({ message: "Aucun recapitulatif disponible pour cette simulation." });
      }

      const reference = `SIM-${simulation.id.slice(-8).toUpperCase()}`;
      const pdf = await renderSimulationPdf({
        reference,
        input: simulation.inputJson as never,
        result: simulation.resultJson as never,
      });

      // Archivage du document genere via l'adaptateur de stockage.
      const storageKey = `simulations/${simulation.id}/${reference}.pdf`;
      await app.storage.put(storageKey, pdf, "application/pdf");

      if (!simulation.pdfDocumentId) {
        const document = await app.prisma.document.create({
          data: { kind: "SIMULATION_SUMMARY", storageKey, mimeType: "application/pdf" },
        });
        await app.prisma.simulation.update({
          where: { id: simulation.id },
          data: { pdfDocumentId: document.id },
        });
      }

      return reply
        .header("Content-Type", "application/pdf")
        .header("Content-Disposition", `attachment; filename="SANARYS-${reference}.pdf"`)
        .send(pdf);
    },
  );
};
